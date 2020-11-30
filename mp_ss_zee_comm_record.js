/**
 * Module Description
 * 
 * NSVersion    Date                Author         
 * 1.00         2020-10-26 12:47:00 Anesu
 *
 * Description: Ability for the franchisee to see the commission they earned for both product as well as services.
 *              Show how many invoices got paid and how much commission got for those vs how many are unpaid and how much commission for those.
 *              No. of customers as well as the distribution date of the commission.
 * 
 * @Last Modified by:   Anesu Chakaingesu
 * @Last Modified time: 2020-10-26 16:14:20
 */

var adhoc_inv_deploy = 'customdeploy_ss_zee_comm_record';
var prev_inv_deploy = null;
var ctx = nlapiGetContext();
var index_in_callback = 0;

function zeeBillSearch() {
    // Script parameters
    var zee_id = ctx.getSetting('SCRIPT', 'custscript_zcp_zee_id');
    var date_from = ctx.getSetting('SCRIPT', 'custscript_date_from');
    if (isNullorEmpty(date_from)) { date_from = '' }
    var date_to = ctx.getSetting('SCRIPT', 'custscript_date_to');
    if (isNullorEmpty(date_to)) { date_to = '' }

    var main_index = parseInt(ctx.getSetting('SCRIPT', 'custscript_main_index'));

    if (isNaN(main_index)) {
        main_index = 0;
    }

    nlapiLogExecution('DEBUG', 'Param zee_id', zee_id);
    nlapiLogExecution('DEBUG', 'Param date_from', date_from);
    nlapiLogExecution('DEBUG', 'Param date_to', date_to);
    nlapiLogExecution('DEBUG', 'Param main_index', main_index);

    var bills_id_set = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_bills_id_set'));
    var operator_dict = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_operator_dict'));
    var zee_id_set = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_zee_id_set'));

    var zeesSearch = nlapiLoadSearch('partner', 'customsearch907');
    var zeesSearchResults = zeesSearch.runSearch();

    zeesSearchResults.forEachResult(function(zeeResult, index) {
        index_in_callback = index;

        // If the limit of governance units is almost reached, 
        // or if the last element of the billResultArray is reached,
        // the script is rescheduled and the results will be iterated from this element.
        var usage_loopstart_cust = ctx.getRemainingUsage();
        if (usage_loopstart_cust < 500 || index == 999) {
            nlapiLogExecution('DEBUG', 'usage_loopstart_cust', usage_loopstart_cust);
            nlapiLogExecution('DEBUG', 'index', index);
            nlapiLogExecution('DEBUG', 'main_index + index', main_index + index);

            var params = {
                custscript_zcp_zee_id: zee_id,
                custscript_date_from: date_from,
                custscript_date_to: date_to,
                custscript_main_index: main_index + index,
                custscript_bills_id_set: JSON.stringify(bills_id_set),
                custscript_zee_id_set: JSON.stringify(zee_id_set)
            };

            reschedule = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
            nlapiLogExecution('AUDIT', 'Reschedule Return', reschedule);
            if (reschedule == false) {
                return false;
            }
        } else {
            var zee_id = zeeResult.getValue('internalid');
            var billResultSet = loadBillSearch(zee_id);
            var billResultArray = billResultSet.getResults(main_index, main_index + 1000);

            billResultArray.forEachResult(function(billResult, index) {
                var zee_id_bill = billResult.getValue('entity');
                if (zee_id == zee_id_bill) {
                    var bill_id = billResult.getValue('tranid');

                    if (bills_id_set.indexOf(bill_id) == -1) {
                        bills_id_set.push(bill_id);

                        var operator_id = '';

                        var invoice_number = billResult.getText('custbody_invoice_reference');
                        var invoice_id = billResult.getValue('custbody_invoice_reference');
                        var bill_number = billResult.getValue('invoicenum');
                        var invoice_type = billResult.getValue('custbody_related_inv_type');
                        var invoice_status = billResult.getValue('custbody_invoice_status');

                        // Revenues
                        var total_amount = parseFloat(billResult.getValue('custbody_invoicetotal'));
                        var revenue_tax = parseFloat(billResult.getValue('custbody_taxtotal'));

                        // Commissions
                        var billing_amount = parseFloat(billResult.getValue('amount'));
                        var tax_commission = Math.abs(parseFloat(billResult.getValue('taxtotal')));

                        // // Credit Memo Info                   
                        var creditMemoResultSet = loadCreditMemoInvoice(invoice_id);
                        if (creditMemoResultSet.length > 0 || !isNullorEmpty(creditMemoResultSet)) {
                            creditMemoResultSet.forEach(function(creditMemoResult) {
                                var credit_id = creditMemoResult.getId();
                                var creditmemo = nlapiLoadRecord('creditmemo', credit_id);
                                var credit_memo_type = creditmemo.getLineItemValue('item', 'itemtype', 1); // Invoice Type
                                if (credit_memo_type == 'Service') {
                                    // credit_memo_type = 'S';
                                    nb_credit_memo_services += 1;
                                    credit_memo_services_revenues += parseFloat(creditmemo.getFieldValue('subtotal'));
                                    credit_memo_services_revenues_tax += parseFloat(creditmemo.getFieldValue('taxtotal'));
                                    credit_memo_services_revenues_total += parseFloat(creditmemo.getFieldValue('total'));
                                } else if (credit_memo_type == 'NonInvtPart') {
                                    // credit_memo_type = 'P';
                                    nb_credit_memo_products += 1;
                                    credit_memo_products_revenues += parseFloat(creditmemo.getFieldValue('subtotal'));
                                    credit_memo_products_revenues_tax += parseFloat(creditmemo.getFieldValue('taxtotal'));
                                    credit_memo_products_revenues_total += parseFloat(creditmemo.getFieldValue('total'));
                                }
                            });
                        }

                        var billCreditResultSet = loadBillCredit(invoice_id);
                        if (billCreditResultSet.length > 0 || !isNullorEmpty(billCreditResultSet)) {
                            billCreditResultSet.forEach(function(billCreditResultSet) {
                                var bill_credit_id = billCreditResultSet.getId();
                                var billCredit = nlapiLoadRecord('vendorcredit', bill_credit_id);
                                // Commissions - Bill Credit
                                credit_memo_services_commissions_tax += parseFloat(billCredit.getFieldValue('taxtotal'));
                                credit_memo_services_commissions_total += parseFloat(billCredit.getFieldValue('total'));
                                credit_memo_services_commissions = credit_memo_services_commissions_total - credit_memo_services_commissions_tax;
                            });
                        }

                        if (isNullorEmpty(invoice_type)) { // Service
                            switch (invoice_status) {
                                case 'Open': // unpaid
                                    unpaid_services_revenues_tax += revenue_tax;
                                    unpaid_services_commissions_tax += tax_commission;
                                    unpaid_services_revenues_total += total_amount;
                                    unpaid_services_commissions_total += billing_amount;
                                    nb_unpaid_services += 1;
                                    break;

                                case 'Paid In Full': // paid
                                    paid_services_revenues_tax += revenue_tax;
                                    paid_services_commissions_tax += tax_commission;
                                    paid_services_revenues_total += total_amount;
                                    paid_services_commissions_total += billing_amount;
                                    nb_paid_services += 1;
                                    break;

                                default:
                                    break;
                            }
                        } else { // Products

                            // Operator dictionnary
                            var barcodeResultSet = loadBarcodesSearch(invoice_id);
                            barcodeResultSet.forEachResult(function(barcodeResult) {
                                operator_id = barcodeResult.getValue('custrecord_cust_prod_stock_operator');
                                var operator_name = barcodeResult.getText('custrecord_cust_prod_stock_operator');

                                if (operator_dict[operator_id] == undefined) {
                                    operator_dict[operator_id] = {
                                        name: operator_name,
                                        nb_invoice_paid: 0,
                                        nb_invoice_unpaid: 0,
                                        total_paid_amount: 0,
                                        tax_paid_amount: 0,
                                        total_unpaid_amount: 0,
                                        tax_unpaid_amount: 0
                                    };
                                    return false;
                                } else {
                                    return true;
                                }
                            });

                            switch (invoice_status) {
                                case 'Open': // unpaid
                                    unpaid_products_revenues_tax += revenue_tax;
                                    unpaid_products_commissions_tax += tax_commission;
                                    unpaid_products_revenues_total += total_amount;
                                    unpaid_products_commissions_total += billing_amount;
                                    nb_unpaid_products += 1;
                                    if (!isNullorEmpty(operator_id)) {
                                        operator_dict[operator_id].total_unpaid_amount += billing_amount;
                                        operator_dict[operator_id].tax_unpaid_amount += tax_commission;
                                        operator_dict[operator_id].nb_invoice_unpaid += total_amount;
                                    }
                                    break;

                                case 'Paid In Full': // paid
                                    paid_products_revenues_tax += revenue_tax;
                                    paid_products_commissions_tax += tax_commission;
                                    paid_products_revenues_total += total_amount;
                                    paid_products_commissions_total += billing_amount;
                                    nb_paid_products += 1;
                                    if (!isNullorEmpty(operator_id)) {
                                        operator_dict[operator_id].total_paid_amount += billing_amount;
                                        operator_dict[operator_id].tax_paid_amount += tax_commission;
                                        operator_dict[operator_id].nb_invoice_paid += total_amount;
                                    }

                                    break;

                                default:
                                    break;
                            }
                        }
                        nb_invoices_array = [nb_paid_services, nb_unpaid_services, nb_paid_products, nb_unpaid_products];
                        revenues_tax_array = [paid_services_revenues_tax, unpaid_services_revenues_tax, paid_products_revenues_tax, unpaid_products_revenues_tax];
                        revenues_total_array = [paid_services_revenues_total, unpaid_services_revenues_total, paid_products_revenues_total, unpaid_products_revenues_total];
                        commissions_tax_array = [paid_services_commissions_tax, unpaid_services_commissions_tax, paid_products_commissions_tax, unpaid_products_commissions_tax];
                        commissions_total_array = [paid_services_commissions_total, unpaid_services_commissions_total, paid_products_commissions_total, unpaid_products_commissions_total];
                        credit_memo_services_array = [credit_memo_services_revenues, credit_memo_services_revenues_tax, credit_memo_services_revenues_total, credit_memo_services_commissions, credit_memo_services_commissions_tax, credit_memo_services_commissions_total];
                        credit_memo_products_array = [credit_memo_products_revenues, credit_memo_products_revenues_tax, credit_memo_products_revenues_total, credit_memo_products_commissions, credit_memo_products_commissions_tax, credit_memo_products_commissions_total];
                        nb_credit_memo_array = [nb_credit_memo_services, nb_credit_memo_products];
                    }
                    var bill_data_set = [nb_invoices_array, revenues_tax_array, revenues_total_array, commissions_tax_array, commissions_total_array, credit_memo_services_array, credit_memo_products_array, nb_credit_memo_array]
                    var bills_set = [bill_id, bill_date, bill_data_set];

                }
            });
        }
        var will_reschedule = (index_in_callback < 999) ? false : true;
        if (will_reschedule) {
            // If the script will be rescheduled, we look for the element 999 of the loop to see if it is empty or not.
            var billNextResultArray = billResultSet.getResults(main_index + index_in_callback, main_index + index_in_callback + 1);
        } else {
            // If the script will not be rescheduled, we make sure we didn't miss any results in the search.
            var billNextResultArray = billResultSet.getResults(main_index + index_in_callback + 1, main_index + index_in_callback + 2);
        }

        nlapiLogExecution('DEBUG', 'bill_id', bill_id);
        nlapiLogExecution('DEBUG', 'zee_id', zee_id);
        nlapiLogExecution('DEBUG', 'bills_set', bills_set);

        var zeeCommRecord = nlapiCreateRecord('customrecord_zee_comm_record');
        zeeCommRecord.setFieldValue('custrecord_zee_id', zee_id);
        zeeCommRecord.setFieldValue('custrecord_bill_id_set', JSON.stringify(bills_set));

        nlapiSubmitRecord(zeeCommissionPageRecord);
    });
}

function loadBillSearch(zee_id) {
    var billSearch = nlapiLoadSearch('vendorbill', 'customsearch_zee_commission_page');
    billSearch.addFilter(new nlobjSearchFilter('custbody_related_franchisee', null, 'is', zee_id));
    var billResultSet = billSearch.runSearch();

    return billResultSet;
}

/**
 * Loads Credit Mmeos based on invoice Number
 * @param {String} invoice_number
 * @return {nlobjSearchResultSet} 'creditMemoResult'
 */
function loadCreditMemoInvoice(invoice_id) {
    var searchCreditMemo = nlapiLoadSearch('creditmemo', 'customsearch_credit_memo');
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
function loadBillCredit(invoice_id) {
    var searchCreditMemo = nlapiLoadSearch('vendorcredit', 'customsearch_bill_credit');
    var creditMemoFilter = [
        ['type', 'anyOf', 'VendCred'], 'AND', ['custbody_invoice_reference', 'is', invoice_id], 'AND', ['mainline', 'is', 'T']
    ]; // 3169057
    searchCreditMemo.setFilterExpression(creditMemoFilter);
    var resultCreditMemo = searchCreditMemo.runSearch();
    var resultsCreditMemo = resultCreditMemo.getResults(0, 1000);

    return resultsCreditMemo;
}