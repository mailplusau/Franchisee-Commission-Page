/**
 * Module Description
 * 
 * NSVersion    Date                Author         
 * 1.00         2020-08-18 15:25:00 Raphael
 *
 * Description: Ability for the franchisee to see the details of the commissions they earned for each invoice.
 * 
 * @Last Modified by:   Anesu
 * @Last Modified time: 2020-09-03 14:11:33
 *
 */

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var adhoc_inv_deploy = 'customdeploy_ss_zee_comm_inv_datatable';
var prev_inv_deploy = null;
var ctx = nlapiGetContext();
var index_in_callback = 0;

function calculateInvoices() {
    // TEST with a paid bill, in order to get the Bill payment id and date
    var billRecord = nlapiLoadRecord('vendorbill', 3169336);
    nlapiLogExecution('DEBUG', 'JSON.stringify(billRecord) [id:3169336]', JSON.stringify(billRecord));
    // var links = billRecord.links;
    // var links_0 = billRecord.links[0];
    // nlapiLogExecution('DEBUG', 'billRecord.links [id:3169336]', JSON.stringify(links));
    // nlapiLogExecution('DEBUG', 'billRecord.links[0] [id:3169336]', links_0);
    // END TEST

    // Script parameters
    var zee_id = ctx.getSetting('SCRIPT', 'custscript_zcid_zee_id');
    var date_from = ctx.getSetting('SCRIPT', 'custscript_zcid_date_from');
    if (isNullorEmpty(date_from)) {
        date_from = ''
    }
    var date_to = ctx.getSetting('SCRIPT', 'custscript_zcid_date_to');
    if (isNullorEmpty(date_to)) {
        date_to = ''
    }
    var type = ctx.getSetting('SCRIPT', 'custscript_zcid_type');
    var paid = ctx.getSetting('SCRIPT', 'custscript_zcid_paid');
    var main_index = parseInt(ctx.getSetting('SCRIPT', 'custscript_zcid_main_index'));
    var timestamp = ctx.getSetting('SCRIPT', 'custscript_zcid_timestamp');

    nlapiLogExecution('DEBUG', 'Param zee_id', zee_id);
    nlapiLogExecution('DEBUG', 'Param date_from', date_from);
    nlapiLogExecution('DEBUG', 'Param date_to', date_to);
    nlapiLogExecution('DEBUG', 'Param type', type);
    nlapiLogExecution('DEBUG', 'Param paid', paid);
    nlapiLogExecution('DEBUG', 'Param main_index', main_index);
    nlapiLogExecution('DEBUG', 'Param timestamp', timestamp);


    // Values to be calculated
    var invoices_rows = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_zcid_invoices_rows'));
    var customer_name_dict = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_zcid_customer_name_dict'));
    var bills_id_set = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_zcid_bills_id_set'));

    // Bill Search
    var billResultSet = loadBillSearch(zee_id, date_from, date_to, type, paid);
    var billResultArray = billResultSet.getResults(main_index, main_index + 1000);

    // Credit Memo Search
    // var creditResultSet = loadCreditMemo(zee_id, date_from, date_to, type, paid);
    // var creditResultArray = creditResultSet.getResults(main_index, main_index + 1000);

    billResultArray.forEach(function(billResult, index) {
        if (index == 0) {
            nlapiLogExecution('DEBUG', 'JSON.stringify(billResult)', JSON.stringify(billResult));
        }
        index_in_callback = index;

        // If the limit of governance units is almost reached, 
        // or if the last element of the billResultArray is reached,
        // the script is rescheduled and the results will be iterated from this element.
        var usage_loopstart_cust = ctx.getRemainingUsage();
        if (usage_loopstart_cust < 200 || index == 999) {
            nlapiLogExecution('DEBUG', 'usage_loopstart_cust', usage_loopstart_cust);
            nlapiLogExecution('DEBUG', 'index', index);
            nlapiLogExecution('DEBUG', 'main_index + index', main_index + index);

            var params = {
                custscript_zcid_zee_id: zee_id,
                custscript_zcid_date_from: date_from,
                custscript_zcid_date_to: date_to,
                custscript_zcid_type: type,
                custscript_zcid_paid: paid,
                custscript_zcid_main_index: main_index + index,
                custscript_zcid_timestamp: timestamp,
                custscript_zcid_invoices_rows: JSON.stringify(invoices_rows),
                custscript_zcid_customer_name_dict: JSON.stringify(customer_name_dict),
                custscript_zcid_bills_id_set: JSON.stringify(bills_id_set)
                    // custscript_zcid_credit_rows: JSON.stringify(credit_rows)
            };

            reschedule = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params)
            nlapiLogExecution('AUDIT', 'Reschedule Return', reschedule);
            if (reschedule == false) {
                return false;
            }
        } else {
            // Make sure each bill is used only once
            var bill_id = billResult.getValue('tranid');
            if (bills_id_set.indexOf(bill_id) == -1) {
                bills_id_set.push(bill_id);

                var re_invoice_number = /Invoice #INV([\d]+)/;
                var invoice_number = billResult.getText('custbody_invoice_reference');
                invoice_number = invoice_number.replace(re_invoice_number, '$1');

                var invoice_id = billResult.getValue('custbody_invoice_reference');
                // var invoice_date = billResult.getValue('custbody_invoice_reference_trandate');

                // Customer name dictionnary
                var customer_id = billResult.getValue('custbody_invoice_customer');
                var customer_name = billResult.getText('custbody_invoice_customer');
                if (customer_name_dict[customer_id] == undefined) {
                    customer_name_dict[customer_id] = customer_name;
                }

                var total_revenue = parseFloat(billResult.getValue('custbody_invoicetotal'));
                var total_commission = parseFloat(billResult.getValue('amount'));
                var invoice_type = billResult.getValue('custbody_related_inv_type');
                invoice_type = (isNullorEmpty(invoice_type)) ? 'S' : 'P'; // Services : Products

                // For the positive commission, check that the paid amount equals the commission amount.
                // If not, the cell background will be colored in red.
                var bill_payment_id = '';
                var bill_payment = '';
                var bill_payment_date = '';
                var paid_amount_is_total_commission = '';

                var billRecord = nlapiLoadRecord('vendorbill', bill_id);
                var invoice_date = billRecord.getFieldValue('custbody_invoice_reference_date');

                if (total_commission > 0) {
                    if (!isNullorEmpty(billRecord.getLineItemValue('links', 'id', 1))) {
                        var paid_amount = billRecord.getLineItemValue('links', 'total', 1);
                        bill_payment_id = billRecord.getLineItemValue('links', 'id', 1);
                        bill_payment = 'Bill #' + bill_payment_id;
                        bill_payment_date = billRecord.getLineItemValue('links', 'trandate', 1);
                        paid_amount_is_total_commission = (paid_amount == total_commission) ? 'T' : 'F';
                    }
                }

                var invoice_status = billResult.getValue('custbody_invoice_status');
                var is = '';
                switch (invoice_status) {
                    case 'Open':
                        is = 'O';
                        break;
                    case 'Paid In Full':
                        is = 'P';
                        break;
                    case 'Voided':
                        is = 'V';
                        break;
                    default:
                        break;
                }
                var invoice_date_paid = billResult.getValue('custbody_date_invoice_paid');

                // Convert the values to the minimal number of characters
                total_revenue = financialConcatenated(total_revenue);
                total_commission = financialConcatenated(total_commission);
                // bill_payment = financialConcatenated(bill_payment);

                /**
                 *  Update: Add Additional Information for Credit Memo Row
                 */
                var credit_memo_name = '',
                    credit_memo_id = '',
                    credit_memo_amount = '',
                    credit_memo_date = '',
                    credit_memo_customer_name = '',
                    credit_memo_type = '',
                    credit_memo_payment_date = '',
                    credit_memo_status = '',
                    bill_credit_amount = '',
                    bill_credit_id = '',
                    bill_credit_payment_id = '',
                    bill_credit_payment_date = '',
                    total_bill = '',
                    total_rev = '',
                    total_comm = '',
                    total_cred = '';

                var resultCreditMemo = loadCreditMemo(invoice_id);
                resultCreditMemo.forEach(function(resultSearchCreditMemo) {;
                    // Using the specific Credit Memo that we have found, Get result total
                    credit_memo_name = resultSearchCreditMemo.getValue('tranid'); // Displays name
                    credit_memo_id = resultSearchCreditMemo.getId();
                    credit_memo_amount = resultSearchCreditMemo.getValue('amount'); // Get Credit amount 
                    credit_memo_date = resultSearchCreditMemo.getValue('trandate');
                    credit_memo_customer_name = resultSearchCreditMemo.getText('entity');
                    credit_memo_type = resultSearchCreditMemo.getValue('custbody_inv_type'); // Invoice Type
                    if (credit_memo_type == '8') {
                        credit_memo_type = 'P';
                    } else if (credit_memo_type == '') {
                        credit_memo_type = 'S';
                    }
                    nlapiLogExecution('AUDIT', 'credit_memo_type', credit_memo_type);
                    credit_memo_payment_date = resultSearchCreditMemo.getValue('custbody_invoice_emailed_date');
                    credit_memo_status = resultSearchCreditMemo.getValue('custbody_invoice_status');
                    if (credit_memo_status == 'Paid In Full') {
                        credit_memo_status = 'F';
                    } else if (credit_memo_status == 'Open') {
                        credit_memo_status = 'O';
                    } else if (credit_memo_status == '') {
                        credit_memo_status = 'V';
                    }
                    // nlapiLogExecution('AUDIT', 'credit_memo_name', credit_memo_name);
                    // nlapiLogExecution('AUDIT', 'credit_memo_amount', credit_memo_amount);
                    // nlapiLogExecution('AUDIT', 'credit_memo_id', credit_memo_id);
                });

                var resultBillCredit = loadBillCredit(invoice_id);
                resultBillCredit.forEach(function(billCreditSet) {
                    bill_credit_amount = billCreditSet.getValue('amount');
                    bill_credit_id = billCreditSet.getId();
                    bill_credit_payment_id = billCreditSet.getId();
                    bill_credit_payment_date = billCreditSet.getValue('trandate');
                    // nlapiLogExecution('AUDIT', 'bill_credit_amount', bill_credit_amount);
                    // nlapiLogExecution('AUDIT', 'bill_credit_id', bill_credit_id);
                    // nlapiLogExecution('AUDIT', 'bill_credit_payment_date', bill_credit_payment_date);
                });

                invoices_rows.push({ in: invoice_number,
                    inid: invoice_id,
                    id: invoice_date,
                    ci: customer_id,
                    tr: total_revenue,
                    tc: total_commission,
                    it: invoice_type,
                    bi: bill_id,
                    bpi: bill_payment_id,
                    bpd: bill_payment_date,
                    idp: invoice_date_paid,
                    is: is,
                    paitc: paid_amount_is_total_commission,
                    cmn: credit_memo_name, // Credit Memo Name
                    cmid: credit_memo_id, // Credit Memo ID
                    cmd: credit_memo_date,
                    cmcm: credit_memo_customer_name,
                    cma: credit_memo_amount, // Credit Memo Amount
                    bca: bill_credit_amount,
                    cmt: credit_memo_type,
                    bcid: bill_credit_id,
                    bcpid: bill_credit_payment_id,
                    bcpd: bill_credit_payment_date,
                    cmpd: credit_memo_payment_date,
                    cms: credit_memo_status,
                });
                return true;
            }
        }
    });

    var will_reschedule = (index_in_callback < 999) ? false : true;
    if (will_reschedule) {
        // If the script will be rescheduled, we look for the element 999 of the loop to see if it is empty or not.
        var billNextResultArray = billResultSet.getResults(main_index + index_in_callback, main_index + index_in_callback + 1);
        // var creditNextArray = creditResultSet.getResults(main_index + index_in_callback, main_index + index_in_callback + 1);
    } else {
        // If the script will not be rescheduled, we make sure we didn't miss any results in the search.
        var billNextResultArray = billResultSet.getResults(main_index + index_in_callback + 1, main_index + index_in_callback + 2);
        // var creditNextArray = creditResultSet.getResults(main_index + index_in_callback + 1, main_index + index_in_callback + 2);
    }

    // nlapiLogExecution('DEBUG', '(billNextResultArray.length == 0)', (billNextResultArray.length == 0));
    // nlapiLogExecution('DEBUG', 'billNextResultArray', billNextResultArray);
    if (billNextResultArray.length == 0) {
        var zeeCommissionInvDatatableRecord = nlapiCreateRecord('customrecord_zee_comm_inv_datatable');
        // zeeCommissionInvDatatableRecord.setFieldValue('altname', zcp_record_name);
        var zcp_record_name = 'zee_id:' + zee_id + '_date_from:' + date_from + '_date_to:' + date_to + '_type:' + type + '_paid:' + paid + '_ts:' + timestamp;
        zeeCommissionInvDatatableRecord.setFieldValue('name', zcp_record_name);
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_zee_id', zee_id);
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_date_from', date_from);
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_date_to', date_to);
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_type', type);
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_paid', paid);
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_timestamp', timestamp);
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_main_index', main_index + index_in_callback);
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_invoices_rows', JSON.stringify(invoices_rows));
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_bills_id_set', JSON.stringify(bills_id_set));
        zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_customer_name_dict', JSON.stringify(customer_name_dict));
        // zeeCommissionInvDatatableRecord.setFieldValue('custrecord_zcid_credit_rows', JSON.stringify(credit_rows));

        nlapiSubmitRecord(zeeCommissionInvDatatableRecord);
    }
}

/**
 * Load the result set of the bill records linked to the Franchisee.
 * @param   {String}                zee_id
 * @param   {String}                date_from   'd/m/YYYY' (NetSuite format)
 * @param   {String}                date_to     'd/m/YYYY' (NetSuite format)
 * @param   {String}                type
 * @param   {String}                paid
 * @return  {nlobjSearchResultSet} `billResultSet`
 */
function loadBillSearch(zee_id, date_from, date_to, type, paid) {
    var billSearch = nlapiLoadSearch('vendorbill', 'customsearch_zee_commission_page');
    billSearch.addFilter(new nlobjSearchFilter('custbody_related_franchisee', null, 'is', zee_id));
    billSearch.addFilter(new nlobjSearchFilter('type', null, 'anyof', 'VendBill'));

    // if (paid == 'credit_memo') {
    //     billSearch.addFilter(new nlobjSearchFilter('type', null, 'anyof', 'CustCred'));
    // } else {
    //     billSearch.addFilter(new nlobjSearchFilter('type', null, 'anyof', 'VendBill'));
    // }

    if (!isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
        billSearch.addFilter(new nlobjSearchFilter('trandate', null, 'within', date_from, date_to));
    } else if (!isNullorEmpty(date_from) && isNullorEmpty(date_to)) {
        billSearch.addFilter(new nlobjSearchFilter('trandate', null, 'after', date_from));
    } else if (isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
        billSearch.addFilter(new nlobjSearchFilter('trandate', null, 'before', date_to));
    }

    // Invoice type filter
    if (type == 'products') {
        billSearch.addFilter(new nlobjSearchFilter('custbody_related_inv_type', null, 'noneof', '@NONE@'));
    } else if (type == 'services') {
        billSearch.addFilter(new nlobjSearchFilter('custbody_related_inv_type', null, 'anyof', '@NONE@'));
    }

    // Invoice status filter
    if (paid == 'paid') {
        billSearch.addFilter(new nlobjSearchFilter('status', null, 'anyof', 'VendBill:B'));
    } else if (paid == 'unpaid') {
        billSearch.addFilter(new nlobjSearchFilter('status', null, 'anyof', 'VendBill:A'));
    }
    var billResultSet = billSearch.runSearch();

    return billResultSet;
}

/**
 * Update: Credit Memo Search Function
 * @param {Integer} zee_id 
 * @param {String} date_from 
 * @param {String} date_to 
 */
function loadCreditMemo(invoice_id) {
    var searchCreditMemo = nlapiLoadSearch('creditmemo', 'customsearch_credit_memo');
    // var creditMemoFilter = [['type', 'anyOf', 'CustCred'], 'AND', ['partner', 'anyof', zee_id], 'AND', ["trandate", "within", date_from, date_to], 'AND', ['mainline', 'is', 'T']];
    var creditMemoFilter = [
        ['type', 'anyOf', 'CustCred'], 'AND', ['custbody_invoice_reference', 'is', invoice_id], 'AND', ['mainline', 'is', 'T']
    ];
    searchCreditMemo.setFilterExpression(creditMemoFilter);
    var resultCreditMemo = searchCreditMemo.runSearch();
    var resultsCreditMemo = resultCreditMemo.getResults(0, 1000);

    return resultsCreditMemo;
}

/**
 * Update: Bill Credit Search Function
 * Search Via Invoice Number
 * @param {String} zee_id 
 * @param {*} date_from 
 * @param {*} date_to 
 */
function loadBillCredit(invoice_id, date_from, date_to) {
    var searchCreditMemo = nlapiLoadSearch('vendorcredit', 'customsearch_bill_credit');
    var creditMemoFilter = [
        ['type', 'anyOf', 'VendCred'], 'AND', ['custbody_invoice_reference', 'is', invoice_id], 'AND', ['mainline', 'is', 'T']
    ]; // 3169057
    searchCreditMemo.setFilterExpression(creditMemoFilter);
    var resultCreditMemo = searchCreditMemo.runSearch();
    var resultsCreditMemo = resultCreditMemo.getResults(0, 1000);

    return resultsCreditMemo;
}

/**
 * @param   {Number} x
 * @returns {String} The same number, written with 2 decimals.
 */
function financialConcatenated(x) {
    if (isNullorEmpty(x)) {
        return "0";
    } else {
        return x.toFixed(2);
    }
}