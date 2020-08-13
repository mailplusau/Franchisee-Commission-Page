/**
* Module Description
* 
* NSVersion    Date                Author         
* 1.00         2020-07-20 09:39:00 Raphael
*
* Description: Ability for the franchisee to see the commission the details of the commissions they earned for each invoice.
* 
* @Last Modified by:   raphaelchalicarnemailplus
* @Last Modified time: 2020-07-21 11:17:00
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
    var date_from = nlapiGetFieldValue('custpage_date_from');
    var date_to = nlapiGetFieldValue('custpage_date_to');

    if (!isNullorEmpty(date_from)) {
        date_from_input = dateFilter2DateSelected(date_from);
        $('#date_from').val(date_from_input);
    }
    if (!isNullorEmpty(date_to)) {
        date_to_input = dateFilter2DateSelected(date_to);
        $('#date_to').val(date_to_input);
    }

    loadDatatable();
}

var billsDataSet = [];
$(document).ready(function () {
    $('#bills-preview').DataTable({
        data: billsDataSet,
        pageLength: 100,
        columns: [
            { title: "Invoice Number" },
            {
                title: "Invoice Date",
                type: "date"
            },
            { title: "Customer Name" },
            {
                title: "Total Revenue",
                type: "num-fmt"
            },
            {
                title: "Total Commission",
                type: "num-fmt"
            },
            { title: "Type" },
            { title: "Bill Number" },
            { title: "Bill Payment" },
            {
                title: "Bill Payment Date",
                type: "date"
            },
            { title: "Invoice Status" },
            { title: "paid_amount == total_commission" }
        ],
        columnDefs: [
            {
                targets: 2,
                className: 'dt-body-left'
            },
            {
                targets: 4,
                createdCell: function (td, cellData, rowData, row, col) {
                    if (rowData[-1] === false) {
                        // If the paid amount is different to the commission amount,
                        // the cell background is red.
                        $(td).css('background-color', '#ffa6a6');
                    }
                }
            },
            {
                targets: -1,
                visible: false,
                searchable: false
            }],
        rowCallback: function (row, data) {
            if (data[9] == 'Open') {
                if ($(row).hasClass('odd')) {
                    $(row).css('background-color', 'LemonChiffon');
                } else {
                    $(row).css('background-color', 'LightYellow');
                }
            }
        }
    });
});

/**
 * On click on the "Back" button, the user is redirect to the Franchisee Commission page,
 * with the parameters of Franchisee and date filters pre-selected.
 */
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

    // Because the invoice_date value is retrieved, and it's an invoice related field,
    // each result is shown three times in the billResultSet.
    // Thus, a set is used to make sure we display each result only once.
    var bills_id_set = new Set();

    if (!isNullorEmpty(billResultSet)) {
        billResultSet.forEachResult(function (billResult) {
            var bill_id = billResult.getValue('tranid');
            if (!bills_id_set.has(bill_id)) {
                bills_id_set.add(bill_id);
                console.log('billResult : ', billResult);

                var invoice_number = billResult.getText('custbody_invoice_reference');
                var invoice_id = billResult.getValue('custbody_invoice_reference');
                var invoice_link = '<a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + invoice_id + '">' + invoice_number + '</a>'
                var invoice_date = billResult.getValue('custbody_invoice_reference_trandate');
                var customer_name = billResult.getText('custbody_invoice_customer');
                var total_revenue = parseFloat(billResult.getValue('custbody_invoicetotal'));
                var total_commission = parseFloat(billResult.getValue('amount'));
                var invoice_type = billResult.getValue('custbody_related_inv_type');
                if (isNullorEmpty(invoice_type)) {
                    invoice_type = 'Services';
                    invoice_number = invoice_link;
                } else {
                    invoice_type = 'Products';
                    if (userRole != 1000) {
                        invoice_number = invoice_link;
                    }
                }
                var bill_number = billResult.getValue('invoicenum');

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
                        paid_amount_is_total_commission = (paid_amount == total_commission);
                    } else {
                        console.log('lineitems.expense : ', lineitems.expense);
                    }
                }

                var invoice_status = billResult.getValue('custbody_invoice_status');

                invoice_date = dateNetsuite2DateSelectedFormat(invoice_date);
                total_revenue = financial(total_revenue);
                total_commission = financial(total_commission);
                bill_payment_date = dateNetsuite2DateSelectedFormat(bill_payment_date);
                billsDataSet.push([invoice_number, invoice_date, customer_name, total_revenue, total_commission, invoice_type, bill_number, bill_payment, bill_payment_date, invoice_status, paid_amount_is_total_commission]);
            }
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

/**
 * Converts the date string in the "date_netsuite" format to the format of "date_selected".
 * @param   {String}    date_netsuite    ex: '4/6/2020'
 * @returns {String}    date            ex: '2020-06-04'
 */
function dateNetsuite2DateSelectedFormat(date_netsuite) {
    if (isNullorEmpty(date_netsuite)) {
        return '';
    } else {
        // date_netsuite = '4/6/2020'
        var date_array = date_netsuite.split('/');
        // date_array = ["4", "6", "2020"]
        var year = date_array[2];
        var month = date_array[1];
        if (month < 10) {
            month = '0' + month;
        }
        var day = date_array[0];
        if (day < 10) {
            day = '0' + day;
        }
        return year + '-' + month + '-' + day;
    }
}

/**
 * Converts the parameters "date_from" and "date_to" to a correct format for the date input field.
 * @param   {String}    date_filter     ex: "04/06/2020"
 * @returns {String}    date_selected   ex: "2020-06-04"
 */
function dateFilter2DateSelected(date_filter) {
    var date_selected = '';
    if (!isNullorEmpty(date_filter)) {
        // date_selected = "04/06/2020"
        var date_array = date_filter.split('/');
        // date_array = ["04", "06", "2020"]
        var year = date_array[2];
        var month = date_array[1];
        var day = date_array[0];
        date_selected = year + '-' + month + '-' + day;
    }
    return date_selected;
}