/**
* Module Description
* 
* NSVersion    Date                Author         
* 2.00         2020-07-14 10:05:00 Raphael
*
* Description: Ability for the franchisee to see the commission they earned for both product as well as services.
*              Show how many invoices got paid and how much commission got for those vs how many are unpaid and how much commission for those.
*              No. of customers as well as the distribution date of the commission.
* 
* @Last Modified by:   raphaelchalicarnemailplus
* @Last Modified time: 2020-07-23 15:07:00
*/

var adhoc_inv_deploy = 'customdeploy_ss_zee_commission_page';
var prev_inv_deploy = null;
var ctx = nlapiGetContext();

function calculateCommissions() {
    // Script parameters
    var zee_id = ctx.getSetting('SCRIPT', 'custscript_zee_id');
    var date_from = ctx.getSetting('SCRIPT', 'custscript_date_from');
    var date_to = ctx.getSetting('SCRIPT', 'custscript_date_to');
    var main_index = ctx.getSetting('SCRIPT', 'custscript_main_index');

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

        // If the limit of governance units is almost reached,
        // the script is rescheduled and the results will be iterated from this element.
        var usage_loopstart_cust = ctx.getRemainingUsage();
        if (usage_loopstart_cust < 200) {
            var params = {
                zee_id: zee_id,
                date_from: date_from,
                date_to: date_to,
                main_index: main_index + index,
                nb_invoices_array: JSON.stringify(nb_invoices_array),
                revenues_tax_array: JSON.stringify(revenues_tax_array),
                revenues_total_array: JSON.stringify(revenues_total_array),
                commissions_tax_array: JSON.stringify(commissions_tax_array),
                commissions_total_array: JSON.stringify(commissions_total_array),
                bills_id_set: JSON.stringify(bills_id_set),
                operator_dict: JSON.stringify(operator_dict)
            };

            reschedule = rescheduleScript(prev_inv_deploy, adhoc_inv_deploy, params);
            nlapiLogExecution('AUDIT', 'Reschedule Return', reschedule);
            if (reschedule == false) {
                return false;
            }
        }

        // Make sure each bill is used only once
        var bill_id = billResult.getValue('tranid');
        if (!bills_id_set.has(bill_id)) {
            bills_id_set.add(bill_id);

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

            /*
            // Just to verify
            var billJson = {
                invoice_number: invoice_number,
                bill_number: bill_number,
                invoice_type: invoice_type,
                invoice_status: invoice_status,
                total_amount: total_amount,
                revenue_tax: revenue_tax,
                billing_amount: billing_amount,
                tax_commission: tax_commission
            };
            */

            if (isNullorEmpty(invoice_type)) { // Services

                switch (invoice_status) {
                    case 'open':        // unpaid
                        unpaid_services_revenues_tax += revenue_tax;
                        unpaid_services_commissions_tax += tax_commission;
                        unpaid_services_revenues_total += total_amount;
                        unpaid_services_commissions_total += billing_amount;
                        nb_unpaid_services += 1;
                        // unpaid_services_bill = billJson; // Just to verify
                        break;

                    case 'paidInFull':  // paid
                        paid_services_revenues_tax += revenue_tax;
                        paid_services_commissions_tax += tax_commission;
                        paid_services_revenues_total += total_amount;
                        paid_services_commissions_total += billing_amount;
                        nb_paid_services += 1;
                        // paid_services_bill = billJson; // Just to verify
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
                    nlapiSetFieldValue('custpage_operator_id', operator_id);

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

                var operator_id = nlapiGetFieldValue('custpage_operator_id');
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
                        // unpaid_products_bill = billJson; // Just to verify
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
                        // paid_products_bill = billJson; // Just to verify
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
    });

    // Save results in a custom record
    var zeeCommissionPageRecord = nlapiCreateRecord('customrecord_zee_commission_page');
    zeeCommissionPageRecord.setFieldValue('custrecord_zee_id', zee_id);
    zeeCommissionPageRecord.setFieldValue('custrecord_date_from', date_from);
    zeeCommissionPageRecord.setFieldValue('custrecord_date_to', date_to);
    zeeCommissionPageRecord.setFieldValue('custrecord_main_index', main_index + index);
    zeeCommissionPageRecord.setFieldValue('custrecord_nb_invoices_array', JSON.stringify(nb_invoices_array));
    zeeCommissionPageRecord.setFieldValue('custrecord_revenues_tax_array', JSON.stringify(revenues_tax_array));
    zeeCommissionPageRecord.setFieldValue('custrecord_revenues_total_array', JSON.stringify(revenues_total_array));
    zeeCommissionPageRecord.setFieldValue('custrecord_commissions_tax_array', JSON.stringify(commissions_tax_array));
    zeeCommissionPageRecord.setFieldValue('custrecord_commissions_total_array', JSON.stringify(commissions_total_array));
    zeeCommissionPageRecord.setFieldValue('custrecord_bills_id_set', JSON.stringify(bills_id_set));
    zeeCommissionPageRecord.setFieldValue('custrecord_operator_dict', JSON.stringify(operator_dict));
    nlapiSubmitRecord(zeeCommissionPageRecord);
}

/**
 * Load the result set of the bill records linked to the Franchisee.
 * @param   {String}                zee_id
 * @param   {String}                date_from   'dd/mm/YYYY'
 * @param   {String}                date_to     'dd/mm/YYYY'
 * @return  {nlobjSearchResultSet} billResultSet
 */
function loadBillSearch(zee_id, date_from, date_to) {
    var billSearch = nlapiLoadSearch('vendorbill', 'customsearch_zee_commission_page');
    var billFilterExpression = billSearch.getFilterExpression();
    billFilterExpression.push('AND', ['custbody_related_franchisee', 'is', zee_id]);

    if (!isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
        billFilterExpression.push('AND', ['trandate', 'within', date_from, date_to]);
    } else if (!isNullorEmpty(date_from) && isNullorEmpty(date_to)) {
        billFilterExpression.push('AND', ['trandate', 'after', date_from]);
    } else if (isNullorEmpty(date_from) && !isNullorEmpty(date_to)) {
        billFilterExpression.push('AND', ['trandate', 'before', date_to]);
    }
    console.log('billFilterExpression : ', billFilterExpression);
    billSearch.setFilterExpression(billFilterExpression);
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
    var barcodeFilterExpression = barcodesSearch.getFilterExpression();
    barcodeFilterExpression.push('AND', ['custrecord_prod_stock_invoice', 'is', invoice_id]);
    barcodesSearch.setFilterExpression(barcodeFilterExpression);
    var barcodeResultSet = barcodesSearch.runSearch();

    return barcodeResultSet;
}