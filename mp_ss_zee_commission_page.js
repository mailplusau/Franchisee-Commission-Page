/**
* Module Description
* 
* NSVersion    Date                Author         
* 2.00         2020-08-12 12:47:00 Raphael
*
* Description: Ability for the franchisee to see the commission they earned for both product as well as services.
*              Show how many invoices got paid and how much commission got for those vs how many are unpaid and how much commission for those.
*              No. of customers as well as the distribution date of the commission.
* 
* @Last Modified by:   raphaelchalicarnemailplus
* @Last Modified time: 2020-08-12 12:47:00
*/

var adhoc_inv_deploy = 'customdeploy_ss_zee_commission_page';
var prev_inv_deploy = null;
var ctx = nlapiGetContext();
var index_in_callback = 0;

function calculateCommissions() {
    // Script parameters
    var zee_id = ctx.getSetting('SCRIPT', 'custscript_zcp_zee_id');
    var date_from = ctx.getSetting('SCRIPT', 'custscript_date_from');
    if (isNullorEmpty(date_from)) { date_from = '' }
    var date_to = ctx.getSetting('SCRIPT', 'custscript_date_to');
    if (isNullorEmpty(date_to)) { date_to = '' }
    var main_index = parseInt(ctx.getSetting('SCRIPT', 'custscript_main_index'));
    var timestamp = ctx.getSetting('SCRIPT', 'custscript_timestamp3');

    nlapiLogExecution('DEBUG', 'Param zee_id', zee_id);
    nlapiLogExecution('DEBUG', 'Param date_from', date_from);
    nlapiLogExecution('DEBUG', 'Param date_to', date_to);
    nlapiLogExecution('DEBUG', 'Param main_index', main_index);
    nlapiLogExecution('DEBUG', 'Param timestamp', timestamp);

    // Values to be calculated
    var nb_invoices_array = [nb_paid_services, nb_unpaid_services, nb_paid_products, nb_unpaid_products] = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_nb_invoices_array'));
    var revenues_tax_array = [paid_services_revenues_tax, unpaid_services_revenues_tax, paid_products_revenues_tax, unpaid_products_revenues_tax] = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_revenues_tax_array'));
    var revenues_total_array = [paid_services_revenues_total, unpaid_services_revenues_total, paid_products_revenues_total, unpaid_products_revenues_total] = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_revenues_total_array'));
    var commissions_tax_array = [paid_services_commissions_tax, unpaid_services_commissions_tax, paid_products_commissions_tax, unpaid_products_commissions_tax] = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_commissions_tax_array'));
    var commissions_total_array = [paid_services_commissions_total, unpaid_services_commissions_total, paid_products_commissions_total, unpaid_products_commissions_total] = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_commissions_total_array'));
    var bills_id_set = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_bills_id_set'));
    var operator_dict = JSON.parse(ctx.getSetting('SCRIPT', 'custscript_operator_dict'));

    var billResultSet = loadBillSearch(zee_id, date_from, date_to);
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
                custscript_zcp_zee_id: zee_id,
                custscript_date_from: date_from,
                custscript_date_to: date_to,
                custscript_main_index: main_index + index,
                custscript_timestamp3: timestamp,
                custscript_nb_invoices_array: JSON.stringify(nb_invoices_array),
                custscript_revenues_tax_array: JSON.stringify(revenues_tax_array),
                custscript_revenues_total_array: JSON.stringify(revenues_total_array),
                custscript_commissions_tax_array: JSON.stringify(commissions_tax_array),
                custscript_commissions_total_array: JSON.stringify(commissions_total_array),
                custscript_bills_id_set: JSON.stringify(bills_id_set),
                custscript_operator_dict: JSON.stringify(operator_dict)
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

                var operator_id = '';

                var invoice_number = billResult.getText('custbody_invoice_reference');
                var invoice_id = billResult.getValue('custbody_invoice_reference');
                var bill_number = billResult.getValue('invoicenum');
                var invoice_type = billResult.getValue('custbody_related_inv_type');
                var invoice_status = billResult.getValue('statusref');

                // Revenues
                var total_amount = parseFloat(billResult.getValue('custbody_invoicetotal'));
                var revenue_tax = parseFloat(billResult.getValue('custbody_taxtotal'));

                // Commissions
                var billing_amount = parseFloat(billResult.getValue('amount'));
                var tax_commission = Math.abs(parseFloat(billResult.getValue('taxtotal')));

                if (isNullorEmpty(invoice_type)) { // Services

                    switch (invoice_status) {
                        case 'open':        // unpaid
                            unpaid_services_revenues_tax += revenue_tax;
                            unpaid_services_commissions_tax += tax_commission;
                            unpaid_services_revenues_total += total_amount;
                            unpaid_services_commissions_total += billing_amount;
                            nb_unpaid_services += 1;
                            break;

                        case 'paidInFull':  // paid
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
                    barcodeResultSet.forEachResult(function (barcodeResult) {
                        operator_id = barcodeResult.getValue('custrecord_cust_prod_stock_operator');
                        var operator_name = barcodeResult.getText('custrecord_cust_prod_stock_operator');

                        if (operator_dict[operator_id] == undefined) {
                            operator_dict[operator_id] = {
                                name: operator_name,
                                total_paid_amount: 0,
                                tax_paid_amount: 0,
                                total_unpaid_amount: 0,
                                tax_unpaid_amount: 0
                            };
                            return false;
                        } else {
                            return true;
                        }
                    })

                    switch (invoice_status) {
                        case 'open':        // unpaid
                            unpaid_products_revenues_tax += revenue_tax;
                            unpaid_products_commissions_tax += tax_commission;
                            unpaid_products_revenues_total += total_amount;
                            unpaid_products_commissions_total += billing_amount;
                            if (!isNullorEmpty(operator_id)) {
                                operator_dict[operator_id].total_unpaid_amount += billing_amount;
                                operator_dict[operator_id].tax_unpaid_amount += tax_commission;
                            }
                            nb_unpaid_products += 1;
                            break;

                        case 'paidInFull':  // paid
                            paid_products_revenues_tax += revenue_tax;
                            paid_products_commissions_tax += tax_commission;
                            paid_products_revenues_total += total_amount;
                            paid_products_commissions_total += billing_amount;
                            if (!isNullorEmpty(operator_id)) {
                                operator_dict[operator_id].total_paid_amount += billing_amount;
                                operator_dict[operator_id].tax_paid_amount += tax_commission;
                            }
                            nb_paid_products += 1;
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
        // Save results in a custom record
        var zcp_record_name = 'zee_id:' + zee_id + '_date_from:' + date_from + '_date_to:' + date_to;
        var zeeCommissionPageRecord = nlapiCreateRecord('customrecord_zee_commission_page');
        zeeCommissionPageRecord.setFieldValue('altname', zcp_record_name);
        zeeCommissionPageRecord.setFieldValue('custrecord_zee_id', zee_id);
        zeeCommissionPageRecord.setFieldValue('custrecord_date_from', date_from);
        zeeCommissionPageRecord.setFieldValue('custrecord_date_to', date_to);
        zeeCommissionPageRecord.setFieldValue('custrecord_timestamp', timestamp);
        zeeCommissionPageRecord.setFieldValue('custrecord_main_index', main_index + index_in_callback);
        zeeCommissionPageRecord.setFieldValue('custrecord_nb_invoices_array', JSON.stringify(nb_invoices_array));
        zeeCommissionPageRecord.setFieldValue('custrecord_revenues_tax_array', JSON.stringify(revenues_tax_array));
        zeeCommissionPageRecord.setFieldValue('custrecord_revenues_total_array', JSON.stringify(revenues_total_array));
        zeeCommissionPageRecord.setFieldValue('custrecord_commissions_tax_array', JSON.stringify(commissions_tax_array));
        zeeCommissionPageRecord.setFieldValue('custrecord_commissions_total_array', JSON.stringify(commissions_total_array));
        zeeCommissionPageRecord.setFieldValue('custrecord_bills_id_set', JSON.stringify(bills_id_set));
        zeeCommissionPageRecord.setFieldValue('custrecord_operator_dict', JSON.stringify(operator_dict));
        nlapiSubmitRecord(zeeCommissionPageRecord);
    }
}

/**
 * Load the result set of the bill records linked to the Franchisee.
 * @param   {String}                zee_id
 * @param   {String}                date_from   'd/m/YYYY' (NetSuite format)
 * @param   {String}                date_to     'd/m/YYYY' (NetSuite format)
 * @return  {nlobjSearchResultSet} `billResultSet`
 */
function loadBillSearch(zee_id, date_from, date_to) {
    var billSearch = nlapiLoadSearch('vendorbill', 'customsearch_zee_commission_page');
    billSearch.addFilter(new nlobjSearchFilter('custbody_related_franchisee', null, 'is', zee_id));

    if (!isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
        billSearch.addFilter(new nlobjSearchFilter('trandate', null, 'within', date_from, date_to));
    } else if (!isNullorEmpty(date_from) && isNullorEmpty(date_to)) {
        billSearch.addFilter(new nlobjSearchFilter('trandate', null, 'after', date_from));
    } else if (isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
        billSearch.addFilter(new nlobjSearchFilter('trandate', null, 'before', date_to));
    }
    var billResultSet = billSearch.runSearch();

    return billResultSet;
}

/**
 * Loads the barcode records related to an invoice.
 * @param   {Number}                invoice_id
 * @return  {nlobjSearchResultSet}  barcodeResultSet
 */
function loadBarcodesSearch(invoice_id) {
    var barcodesSearch = nlapiLoadSearch('customrecord_customer_product_stock', 'customsearch_zee_commission_page_2');
    barcodesSearch.addFilter(new nlobjSearchFilter('custrecord_prod_stock_invoice', null, 'is', invoice_id));
    var barcodeResultSet = barcodesSearch.runSearch();

    return barcodeResultSet;
}