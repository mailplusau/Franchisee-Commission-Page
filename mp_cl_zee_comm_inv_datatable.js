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

function pageInit() {
    var date_from = nlapiGetFieldValue('custpage_date_from');
    var date_to = nlapiGetFieldValue('custpage_date_to');

    if (!isNullorEmpty(date_from)) {
        date_from_input = dateNetsuiteToISO(date_from);
        $('#date_from').val(date_from_input);
    }
    if (!isNullorEmpty(date_to)) {
        date_to_input = dateNetsuiteToISO(date_to);
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
            { title: "Invoice Payment Date" },
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
            if (data[10] == 'Open') {
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
                if (userRole != 1000) {
                    bill_number = '<a href="' + baseURL + '/app/accounting/transactions/vendbill.nl?id=' + bill_id + '">' + bill_number + '</a>';
                }

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
                var invoice_date_paid = billResult.getValue('custbody_date_invoice_paid');

                invoice_date = dateNetsuiteToISO(invoice_date);
                total_revenue = financial(total_revenue);
                total_commission = financial(total_commission);
                bill_payment_date = dateNetsuiteToISO(bill_payment_date);
                invoice_date_paid = dateNetsuiteToISO(invoice_date_paid);
                billsDataSet.push([invoice_number, invoice_date, customer_name, total_revenue, total_commission, invoice_type, bill_number, bill_payment, bill_payment_date, invoice_date_paid, invoice_status, paid_amount_is_total_commission]);
            }
            return true;
        });
    }

    // Update datatable rows.
    var datatable = $('#bills-preview').dataTable().api();
    datatable.clear();
    datatable.rows.add(billsDataSet);
    datatable.draw();

    saveCsv(billsDataSet);

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

    console.log('billFilterExpression : ', billFilterExpression);
    billSearch.setFilterExpression(billFilterExpression);
    var billResultSet = billSearch.runSearch();

    return billResultSet;
}

/**
 * Create the CSV and store it in the hidden field 'custpage_table_csv' as a string.
 * @param {Array} billsDataSet The `billsDataSet` created in `loadDatatable()`.
 */
function saveCsv(billsDataSet) {
    var headers = $('#bills-preview').DataTable().columns().header().toArray().map(function (x) { return x.innerText });
    headers = headers.slice(0, headers.length - 1).join(', ');
    var csv = headers + "\n";
    billsDataSet.forEach(function (row, index) {
        row[0] = $.parseHTML(row[0])[0].text;
        row[3] = financialToNumber(row[3]);
        row[4] = financialToNumber(row[4]);
        row[6] = $.parseHTML(row[6])[0].text;
        if (index < 5) {
            console.log('row :', row);
        }
        csv += row.join(',');
        csv += "\n";
    });
    nlapiSetFieldValue('custpage_table_csv', csv);

    return true;
}

/**
* Load the string stored in the hidden field 'custpage_table_csv'.
* Converts it to a CSV file.
* Creates a hidden link to download the file and triggers the click of the link.
*/
function downloadCsv() {
    var csv = nlapiGetFieldValue('custpage_table_csv');
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var content_type = 'text/csv';
    var csvFile = new Blob([csv], { type: content_type });
    var url = window.URL.createObjectURL(csvFile);
    var filename = 'invoices_' + getCsvName() + '.csv';
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * - The franchisee name `zee_name` in lowercase and separated by an underscore.
 * - the `type` selector ('services', 'products' or nothing).
 * - the `paid` selector ('paid', 'unpaid' or nothing).
 * - the `date_from` date
 * - the `date_to` date
 * @return  {String} 
 */
function getCsvName() {
    var zee_name = nlapiGetFieldValue('custpage_zee_name');
    zee_name = zee_name.trim().toLowerCase().split(' ').join('_');

    var date_from = nlapiGetFieldValue('custpage_date_from');
    var date_to = nlapiGetFieldValue('custpage_date_to');

    var type = nlapiGetFieldValue('custpage_type');
    var type_title = (type == 'services' || type == 'products') ? type : '';

    var paid = nlapiGetFieldValue('custpage_paid');
    var paid_title = (paid == 'paid' || paid == 'unpaid') ? paid : '';

    var type_paid_title = (type_title == '' && paid_title == '') ? '' : '_' + type_title + '_' + paid_title;

    var csv_name = zee_name + type_paid_title + '_from_' + date_from + '_to_' + date_to;
    return csv_name;
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
 * Converts a price string (as returned by the function `financial()`) to a String readable as a Number object
 * @param   {String} price $4,138.47
 * @returns {String} 4138.47
 */
function financialToNumber(price) {
    // Matches the '$' and ',' symbols.
    var re = /\$|\,/g;
    // Replaces all the matched symbols with the empty string ''.
    return price.replace(re, '');
}

/**
 * Used to set the value of the date input fields.
 * @param   {String} date_netsuite  "1/6/2020"
 * @returns {String} date_iso       "2020-06-01"
 */
function dateNetsuiteToISO(date_netsuite) {
    var date_iso = '';
    if (!isNullorEmpty(date_netsuite)) {
        var date = nlapiStringToDate(date_netsuite);
        var date_day = date.getDate();
        var date_month = date.getMonth();
        var date_year = date.getFullYear();
        var date_utc = new Date(Date.UTC(date_year, date_month, date_day));
        date_iso = date_utc.toISOString().split('T')[0];
    }
    return date_iso;
}