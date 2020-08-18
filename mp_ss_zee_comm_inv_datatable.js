/**
* Module Description
* 
* NSVersion    Date                Author         
* 1.00         2020-08-18 15:25:00 Raphael
*
* Description: Ability for the franchisee to see the details of the commissions they earned for each invoice.
* 
* @Last Modified by:   raphaelchalicarnemailplus
* @Last Modified time: 2020-08-18 15:25:00
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
    // Script parameters
    var zee_id = ctx.getSetting('SCRIPT', 'custscript_zcid_zee_id');
    var date_from = ctx.getSetting('SCRIPT', 'custscript_zcid_date_from');
    if (isNullorEmpty(date_from)) { date_from = '' }
    var date_to = ctx.getSetting('SCRIPT', 'custscript_zcid_date_to');
    if (isNullorEmpty(date_to)) { date_to = '' }
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

    var billResultSet = loadBillSearch(zee_id, date_from, date_to, type, paid);
    var billResultArray = billResultSet.getResults(main_index, main_index + 1000);

    billResultArray.forEach(function (billResult, index) {
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
                custscript_zcid_bills_id_set: JSON.stringify(bills_id_set),
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

                var re_invoice_number = /Invoice #([\w]+)/;
                var invoice_number = billResult.getText('custbody_invoice_reference');
                invoice_number = re_invoice_number.replace(re, '$1');

                var invoice_id = billResult.getValue('custbody_invoice_reference');

                // Customer name dictionnary
                var customer_id = billResult.getValue('custbody_invoice_customer');
                var customer_name = billResult.getText('custbody_invoice_customer');
                if (customer_name_dict[customer_id] == undefined) {
                    customer_name_dict[customer_id] = {
                        name: customer_name
                    };
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
                if (total_commission > 0) {
                    var billRecord = nlapiLoadRecord('vendorbill', bill_id);
                    var lineitems = billRecord.lineitems;
                    if (!isNullorEmpty(lineitems.links)) {
                        var lineitems_links_1 = lineitems.links[1];
                        var paid_amount = lineitems_links_1.total;
                        bill_payment_id = lineitems_links_1.id;
                        bill_payment = 'Bill #' + bill_payment_id;
                        bill_payment_date = lineitems_links_1.trandate;
                        paid_amount_is_total_commission = (paid_amount == total_commission) ? 'T' : 'F';
                    } else {
                        nlapiLogExecution('DEBUG', 'lineitems.expense : ', lineitems.expense);
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
                bill_payment = financialConcatenated(bill_payment);
                invoices_rows.push({
                    in: invoice_number,
                    inid: invoice_id,
                    tr: total_revenue,
                    tc: total_commission,
                    it: invoice_type,
                    bi: bill_id,
                    bp: bill_payment,
                    bpd: bill_payment_date,
                    idp: invoice_date_paid,
                    is: is,
                    paitc: paid_amount_is_total_commission
                });

                return true;
            }
        }
    });

    var will_reschedule = (index_in_callback < 999) ? false : true;
    if (will_reschedule) {
        // If the script will be rescheduled, we look for the element 999 of the loop to see if it is empty or not.
        var billNextResultArray = billResultSet.getResults(main_index + index_in_callback, main_index + index_in_callback + 1);
    } else {
        // If the script will not be rescheduled, we make sure we didn't miss any results in the search.
        var billNextResultArray = billResultSet.getResults(main_index + index_in_callback + 1, main_index + index_in_callback + 2);
    }

    nlapiLogExecution('DEBUG', '(billNextResultArray.length == 0)', (billNextResultArray.length == 0));
    if (billNextResultArray.length == 0) {
        var zeeCommissionInvDatatableRecord = nlapiCreateRecord('customrecord_zee_comm_inv_datatable');
        // zeeCommissionInvDatatableRecord.setFieldValue('altname', zcp_record_name);
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
        nlapiSubmitRecord(zeeCommissionInvDatatableRecord);
    }
}

/**
 * Load the result set of the bill records linked to the Franchisee.
 * @param   {Number}                zee_id
 * @param   {String}                date_from
 * @param   {String}                date_to
 * @param   {String}                type
 * @param   {String}                paid
 * @return  {nlobjSearchResultSet}  billResultSet
 */
function loadBillSearch(zee_id, date_from, date_to, type, paid) {
    var billSearch = nlapiLoadSearch('vendorbill', 'customsearch_zee_commission_page');

    var billFilterExpression = billSearch.getFilterExpression();
    billFilterExpression.push('AND', ['custbody_related_franchisee', 'anyof', zee_id]);

    // Date filter
    if (!isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
        billFilterExpression.push('AND', ['trandate', 'within', date_from, date_to]);
    } else if (!isNullorEmpty(date_from) && isNullorEmpty(date_to)) {
        billFilterExpression.push('AND', ['trandate', 'after', date_from]);
    } else if (isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
        billFilterExpression.push('AND', ['trandate', 'before', date_to]);
    }

    // Invoice type filter
    if (type == 'products') {
        billFilterExpression.push('AND', ['custbody_related_inv_type', 'noneof', '@NONE@']);
    } else if (type == 'services') {
        billFilterExpression.push('AND', ['custbody_related_inv_type', 'anyof', '@NONE@']);
    }

    // Invoice status filter
    if (paid == 'paid') {
        billFilterExpression.push('AND', ['status', 'anyof', 'VendBill:B']);
    } else if (paid == 'unpaid') {
        billFilterExpression.push('AND', ['status', 'anyof', 'VendBill:A']);
    }

    nlapiLogExecution('DEBUG', 'billFilterExpression : ', billFilterExpression);
    billSearch.setFilterExpression(billFilterExpression);
    var billResultSet = billSearch.runSearch();

    return billResultSet;
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