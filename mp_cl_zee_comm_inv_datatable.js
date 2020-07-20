/**
* Module Description
* 
* NSVersion    Date                Author         
* 1.00         2020-07-20 09:39:00 Raphael
*
* Description: Ability for the franchisee to see the commission the details of the commissions they earned for each invoice.
* 
* @Last Modified by:   raphaelchalicarnemailplus
* @Last Modified time: 2020-07-20 09:39:00
*
*/

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var ctx = nlapiGetContext();
var userRole = parseInt(ctx.getRole());
if (userRole == 1000) {
    var zee_id = ctx.getUser();
}

// For test
/*
var userRole = 1000;
zee_id = '215';
zee_name = 'Alexandria';
*/

function pageInit() {
    loadDatatable();
}

var billsDataSet = [];
$(document).ready(function () {
    $('#bills-preview').DataTable({
        data: billsDataSet,
        columns: [
            { title: "Invoice Number" },
            { title: "Customer Name" },
            { title: "Total Revenue" },
            { title: "Total Commission" },
            { title: "Bill Number" },
            { title: "Invoice Status" }
        ]
    });
});

function onBack() {
    var zee_id = nlapiGetFieldValue('custpage_zee_id');
    var date_from = nlapiGetFieldValue('custpage_date_from');
    var date_to = nlapiGetFieldValue('custpage_date_to');
    var params = {
        zee_id: parseInt(zee_id),
        date_from: date_from,
        date_to: date_to
    };
    params = JSON.stringify(params);
    var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_zee_commission_page', 'customdeploy_sl_zee_commission_page') + '&custparam_params=' + encodeURIComponent(params);
    window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
}

function loadDatatable() {
    var billResultSet = loadBillSearch();

    $('#result_bills').empty();
    var billsDataSet = [];

    if (!isNullorEmpty(billResultSet)) {
        billResultSet.forEachResult(function (billResult) {

            var invoice_number = billResult.getText('custbody_invoice_reference');
            var customer_name = billResult.getText('custbody_invoice_customer');
            var total_revenue = parseFloat(billResult.getValue('custbody_invoicetotal'));
            total_revenue = financial(total_revenue);
            var total_commission = parseFloat(billResult.getValue('amount'));
            total_commission = financial(total_commission);
            var bill_number = billResult.getValue('invoicenum');
            var invoice_status = billResult.getText('statusref');

            billsDataSet.push([invoice_number, customer_name, total_revenue, total_commission, bill_number, invoice_status]);

            return true;
        });
    }

    // Update datatable rows.
    var datatable = $('#bills-preview').dataTable().api();
    datatable.clear();
    datatable.rows.add(billsDataSet);
    datatable.draw();

    return true;
}

/**
 * Load the result set of the bill records linked to the Franchisee.
 * @return  {nlobjSearchResultSet}  billResultSet
 */
function loadBillSearch() {
    var zee_id = parseInt(nlapiGetFieldValue('custpage_zee_id'));
    var date_from = nlapiGetFieldValue('custpage_date_from');
    var date_to = nlapiGetFieldValue('custpage_date_to');
    var type = nlapiGetFieldValue('custpage_type');
    var paid = nlapiGetFieldValue('custpage_paid');

    var billSearch = nlapiLoadSearch('vendorbill', 'customsearch_zee_commission_page');
    var billFilterExpression = billSearch.getFilterExpression();
    billFilterExpression.push('AND', ['custbody_related_franchisee', 'is', zee_id]);

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

    console.log('billFilterExpression : ', billFilterExpression);
    billSearch.setFilterExpression(billFilterExpression);
    var billResultSet = billSearch.runSearch();

    return billResultSet;
}

/**
 * @param   {Number} x
 * @returns {String} The same number, formatted in Australian dollars.
 */
function financial(x) {
    if (isNullorEmpty(x)) {
        return "$0.00";
    } else {
        return x.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    }
}