/**
* Module Description
* 
* NSVersion    Date                Author         
* 1.00         2020-07-14 10:05:00 Raphael
*
* Description: Ability for the franchisee to see the commission they earned for both product as well as services.
*              Show how many invoices got paid and how much commission got for those vs how many are unpaid and how much commission for those.
*              No. of customers as well as the distribution date of the commission.
* 
* @Last Modified by:   raphaelchalicarnemailplus
* @Last Modified time: 2020-07-13 16:23:00
*
*/

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}
var userRole = parseInt(nlapiGetContext().getRole());

function pageInit() {
    $('div.col-xs-12.commission_table_div').html(commissionTable());
    $('#zee_dropdown').change(function () { loadCommissionTable() });
    $('#period_dropdown').change(function () { selectDate() });
    $('#date_from, #date_to').change(function () {
        loadCommissionTable();
        $('#period_dropdown option:selected').attr('selected', false);
    });
}

function saveRecord() {

}

/**
 * Triggered when a Franchisee is selected in the dropdown list.
 */
function loadCommissionTable() {
    var zee_id = $('#zee_dropdown option:selected').val();
    var zee_name = $('#zee_dropdown option:selected').text();
    $('.uir-page-title-firstline h1').text('Franchisee ' + zee_name + ' : Commission page');
    var date_from = dateSelected2DateFilter($('#date_from').val());
    var date_to = dateSelected2DateFilter($('#date_to').val());

    nlapiSetFieldValue('custpage_zee_id', zee_id);
    if (!isNullorEmpty(zee_id)) {
        var billResultSet = loadBillSearch(zee_id, date_from, date_to);

        var nb_paid_services = 0;
        var nb_unpaid_services = 0;
        var nb_paid_products = 0;
        var nb_unpaid_products = 0;

        // Just to verify
        var paid_services_bill = '';
        var unpaid_services_bill = '';
        var paid_products_bill = '';
        var unpaid_products_bill = '';

        // Revenues
        var paid_services_revenues = null;
        var unpaid_services_revenues = null;
        var paid_products_revenues = null;
        var unpaid_products_revenues = null;
        // Revenues tax
        var paid_services_revenues_tax = null;
        var unpaid_services_revenues_tax = null;
        var paid_products_revenues_tax = null;
        var unpaid_products_revenues_tax = null;
        // Revenues tax total
        var paid_services_revenues_total = null;
        var unpaid_services_revenues_total = null;
        var paid_products_revenues_total = null;
        var unpaid_products_revenues_total = null;

        // Commissions
        var paid_services_commissions = null;
        var unpaid_services_commissions = null;
        var paid_products_commissions = null;
        var unpaid_products_commissions = null;
        // Commissions tax
        var paid_services_commissions_tax = null;
        var unpaid_services_commissions_tax = null;
        var paid_products_commissions_tax = null;
        var unpaid_products_commissions_tax = null;
        // Commissions total
        var paid_services_commissions_total = null;
        var unpaid_services_commissions_total = null;
        var paid_products_commissions_total = null;
        var unpaid_products_commissions_total = null;

        var i = 0;

        if (!isNullorEmpty(billResultSet)) {
            billResultSet.forEachResult(function (billResult) {
                if (i == 0) {
                    console.log('billResult : ', billResult);
                    i += 1;
                }

                var invoice_number = billResult.getText('custbody_invoice_reference');
                var bill_number = billResult.getValue('invoicenum');
                var invoice_type = billResult.getValue('custbody_related_inv_type');
                var invoice_status = billResult.getValue('statusref');

                // Revenues
                var total_amount = parseFloat(billResult.getValue('custbody_invoicetotal'));
                var revenue_tax = parseFloat(billResult.getValue('custbody_taxtotal'));

                // Commissions
                var billing_amount = parseFloat(billResult.getValue('amount'));
                var tax_commission = Math.abs(parseFloat(billResult.getValue('taxtotal')));

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

                if (isNullorEmpty(invoice_type)) {
                    // Services
                    switch (invoice_status) {
                        case 'open':        // unpaid
                            unpaid_services_revenues_tax += revenue_tax;
                            unpaid_services_commissions_tax += tax_commission;
                            unpaid_services_revenues_total += total_amount;
                            unpaid_services_commissions_total += billing_amount;
                            nb_unpaid_services += 1;
                            unpaid_services_bill = billJson; // Just to verify
                            break;

                        case 'paidInFull':  // paid
                            paid_services_revenues_tax += revenue_tax;
                            paid_services_commissions_tax += tax_commission;
                            paid_services_revenues_total += total_amount;
                            paid_services_commissions_total += billing_amount;
                            nb_paid_services += 1;
                            paid_services_bill = billJson; // Just to verify
                            break;

                        default:
                            break;
                    }
                } else {
                    // Products
                    switch (invoice_status) {
                        case 'open':        // unpaid
                            unpaid_products_revenues_tax += revenue_tax;
                            unpaid_products_commissions_tax += tax_commission;
                            unpaid_products_revenues_total += total_amount;
                            unpaid_products_commissions_total += billing_amount;
                            nb_unpaid_products += 1;
                            unpaid_products_bill = billJson; // Just to verify
                            break;

                        case 'paidInFull':  // paid
                            paid_products_revenues_tax += revenue_tax;
                            paid_products_commissions_tax += tax_commission;
                            paid_products_revenues_total += total_amount;
                            paid_products_commissions_total += billing_amount;
                            nb_paid_products += 1;
                            paid_products_bill = billJson; // Just to verify
                            break;

                        default:
                            break;
                    }
                }
                return true;
            });
        }

        var paid_services_row = [paid_services_revenues_tax, paid_services_revenues_total, paid_services_commissions_tax, paid_services_commissions_total];
        var unpaid_services_row = [unpaid_services_revenues_tax, unpaid_services_revenues_total, unpaid_services_commissions_tax, unpaid_services_commissions_total];
        var paid_products_row = [paid_products_revenues_tax, paid_products_revenues_total, paid_products_commissions_tax, paid_products_commissions_total];
        var unpaid_products_row = [unpaid_products_revenues_tax, unpaid_products_revenues_total, unpaid_products_commissions_tax, unpaid_products_commissions_total];

        // Calculate Revenue and Commission without GST
        paid_services_row = [paid_services_revenues, paid_services_revenues_tax, paid_services_revenues_total, paid_services_commissions, paid_services_commissions_tax, paid_services_commissions_total] = calculateWithoutTax(paid_services_row);
        unpaid_services_row = [unpaid_services_revenues, unpaid_services_revenues_tax, unpaid_services_revenues_total, unpaid_services_commissions, unpaid_services_commissions_tax, unpaid_services_commissions_total] = calculateWithoutTax(unpaid_services_row);
        paid_products_row = [paid_products_revenues, paid_products_revenues_tax, paid_products_revenues_total, paid_products_commissions, paid_products_commissions_tax, paid_products_commissions_total] = calculateWithoutTax(paid_products_row);
        unpaid_products_row = [unpaid_products_revenues, unpaid_products_revenues_tax, unpaid_products_revenues_total, unpaid_products_commissions, unpaid_products_commissions_tax, unpaid_products_commissions_total] = calculateWithoutTax(unpaid_products_row);

        // Calculate Sum rows (Services, Products, Paid, Unpaid and Total)
        var services_row = [services_revenues, services_revenues_tax, services_revenues_total, services_commissions, services_commissions_tax, services_commissions_total] = sum2arrays(paid_services_row, unpaid_services_row);
        var products_row = [products_revenues, products_revenues_tax, products_revenues_total, products_commissions, products_commissions_tax, products_commissions_total] = sum2arrays(paid_products_row, unpaid_products_row);
        var paid_row = [paid_revenues, paid_revenues_tax, paid_revenues_total, paid_commissions, paid_commissions_tax, paid_commissions_total] = sum2arrays(paid_services_row, paid_products_row);
        var unpaid_row = [unpaid_revenues, unpaid_revenues_tax, unpaid_revenues_total, unpaid_commissions, unpaid_commissions_tax, unpaid_commissions_total] = sum2arrays(unpaid_services_row, unpaid_products_row);
        var total_row = [revenues, revenues_tax, revenues_total, commissions, commissions_tax, commissions_total] = sum2arrays(unpaid_row, paid_row);

        // Convert Numbers to formatted currency strings.
        paid_services_row = paid_services_row.map(financial);
        unpaid_services_row = unpaid_services_row.map(financial);
        paid_products_row = paid_products_row.map(financial);
        unpaid_products_row = unpaid_products_row.map(financial);
        services_row = services_row.map(financial);
        products_row = products_row.map(financial);
        paid_row = paid_row.map(financial);
        unpaid_row = unpaid_row.map(financial);
        total_row = total_row.map(financial);

        // Add number of invoices per category at the beginning of each row
        paid_services_row = [nb_paid_services].concat(paid_services_row);
        unpaid_services_row = [nb_unpaid_services].concat(unpaid_services_row);
        paid_products_row = [nb_paid_products].concat(paid_products_row);
        unpaid_products_row = [nb_unpaid_products].concat(unpaid_products_row);
        services_row = [nb_paid_services + nb_unpaid_services].concat(services_row);
        products_row = [nb_paid_products + nb_unpaid_products].concat(products_row);
        paid_row =  [nb_paid_services + nb_paid_products].concat(paid_row);
        unpaid_row = [nb_unpaid_services + nb_unpaid_products].concat(unpaid_row);
        total_row = [nb_paid_services + nb_paid_products + nb_unpaid_services + nb_unpaid_products].concat(total_row);

        console.log('nb_paid_services : ', nb_paid_services);
        console.log('paid_services_bill : ', paid_services_bill);

        console.log('nb_unpaid_services : ', nb_unpaid_services);
        console.log('unpaid_services_bill : ', unpaid_services_bill);

        console.log('nb_paid_products : ', nb_paid_products);
        console.log('paid_products_bill : ', paid_products_bill);

        console.log('nb_unpaid_products : ', nb_unpaid_products);
        console.log('unpaid_products_bill : ', unpaid_products_bill);

        // Total
        var total_selector = '#commission_table tbody tr.total_row.sum_row';
        setRow(total_selector, total_row);
        // Total (paid)
        var paid_total_selector = '#commission_table tbody tr.total_row.paid_row';
        setRow(paid_total_selector, paid_row);
        // Total (unpaid)
        var unpaid_total_selector = '#commission_table tbody tr.total_row.unpaid_row';
        setRow(unpaid_total_selector, unpaid_row);

        // Services
        var services_selector = '#commission_table tbody tr.services_row.sum_row';
        setRow(services_selector, services_row);
        // Services (paid)
        var paid_services_selector = '#commission_table tbody tr.services_row.paid_row';
        setRow(paid_services_selector, paid_services_row);
        // Services (unpaid)
        var unpaid_services_selector = '#commission_table tbody tr.services_row.unpaid_row';
        setRow(unpaid_services_selector, unpaid_services_row);

        // Products
        var products_selector = '#commission_table tbody tr.products_row.sum_row';
        setRow(products_selector, products_row);
        // Products (paid)
        var paid_products_selector = '#commission_table tbody tr.products_row.paid_row';
        setRow(paid_products_selector, paid_products_row);
        // Products (unpaid)
        var unpaid_products_selector = '#commission_table tbody tr.products_row.unpaid_row';
        setRow(unpaid_products_selector, unpaid_products_row);

        $('.commission_table').removeClass('hide');
    }
}

/**
 * Set the values of a row in the commission_table.
 * @param {String}  row_selector    JQuery to select a row in the commission_table
 * @param {Array}   amounts_array   Array of the values to enter in the commission_table selected row.
 */
function setRow(row_selector, amounts_array) {
    var [nb_invoices, revenues, revenues_tax, revenues_total, commissions, commissions_tax, commissions_total] = amounts_array;
    $(row_selector + ' td[headers="table_nb_invoices"]').text(nb_invoices);
    $(row_selector + ' td[headers="table_revenue"]').text(revenues);
    $(row_selector + ' td[headers="table_revenue_tax"]').text(revenues_tax);
    $(row_selector + ' td[headers="table_revenue_total"]').text(revenues_total);
    $(row_selector + ' td[headers="table_commission"]').text(commissions);
    $(row_selector + ' td[headers="table_commission_tax"]').text(commissions_tax);
    $(row_selector + ' td[headers="table_commission_total"]').text(commissions_total);
}

/**
 * Calculate the commission and revenue by deducting the tax from the total amount.
 * @param   {Array} amount_row  (length 4)
 * @returns {Array} amount_row  (length 6)
 */
function calculateWithoutTax(amount_row) {
    var [revenues_tax, revenues_total, commissions_tax, commissions_total] = amount_row;
    var revenues = revenues_total - revenues_tax;
    var commission = commissions_total - commissions_tax;
    return [revenues, revenues_tax, revenues_total, commission, commissions_tax, commissions_total];
}

/**
 * Both array should have the same length.
 * @param {Array}   array1 
 * @param {Array}   array2 
 * @returns {Array} The sum of each element of the two arrays.
 */
function sum2arrays(array1, array2) {
    var length_1 = array1.length;
    var length_2 = array2.length;
    if (length_1 != length_2) {
        return false;
    } else {
        var sum_array = new Array(length_1);
        for (var i = 0; i < length_1; i++) {
            sum_array[i] = array1[i] + array2[i];
        }
        return sum_array;
    }
}

function selectDate() {
    var period_selected = $('#period_dropdown option:selected').val();
    var today = new Date();
    var today_day_in_month = today.getDate();
    var today_day_in_week = today.getDay();
    var today_month = today.getMonth();
    var today_year = today.getFullYear();

    switch (period_selected) {
        case "this_week":

            // This method changes the variable "today" and sets it on the previous monday
            if (today_day_in_week == 0) {
                var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - 6));
            } else {
                var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - today_day_in_week + 1));
            }
            var date_from = monday.toISOString().split('T')[0];
            var date_to = '';
            break;

        case "last_week":
            var today_day_in_month = today.getDate();
            var today_day_in_week = today.getDay();
            // This method changes the variable "today" and sets it on the previous monday
            if (today_day_in_week == 0) {
                var previous_sunday = new Date(Date.UTC(today_year, today_month, today_day_in_month - 7));
            } else {
                var previous_sunday = new Date(Date.UTC(today_year, today_month, today_day_in_month - today_day_in_week));
            }

            var previous_sunday_year = previous_sunday.getFullYear();
            var previous_sunday_month = previous_sunday.getMonth();
            var previous_sunday_day_in_month = previous_sunday.getDate();

            var monday_before_sunday = new Date(Date.UTC(previous_sunday_year, previous_sunday_month, previous_sunday_day_in_month - 6));

            var date_from = monday_before_sunday.toISOString().split('T')[0];
            var date_to = previous_sunday.toISOString().split('T')[0];
            break;

        case "this_month":
            var first_day_month = new Date(Date.UTC(today_year, today_month));
            var date_from = first_day_month.toISOString().split('T')[0];
            var date_to = '';
            break;

        case "last_month":
            var first_day_previous_month = new Date(Date.UTC(today_year, today_month - 1));
            var last_day_previous_month = new Date(Date.UTC(today_year, today_month, 0));
            var date_from = first_day_previous_month.toISOString().split('T')[0];
            var date_to = last_day_previous_month.toISOString().split('T')[0];
            break;

        case "full_year":
            var first_day_in_year = new Date(Date.UTC(today_year, 0));
            var date_from = first_day_in_year.toISOString().split('T')[0];
            var date_to = '';
            break;

        case "financial_year":
            if (today_month >= 6) {
                var first_july = new Date(Date.UTC(today_year, 6));
            } else {
                var first_july = new Date(Date.UTC(today_year - 1, 6));
            }
            var date_from = first_july.toISOString().split('T')[0];
            var date_to = '';
            break;

        default:
            var date_from = '';
            var date_to = '';
            break;
    }
    $('#date_from').val(date_from);
    $('#date_to').val(date_to);
    loadCommissionTable();
}

/**
 * Load the result set of the invoices records linked to the Franchisee.
 * @param   {String}                zee_id
 * @param   {String}                date_from
 * @param   {String}                date_to
 * @return  {nlobjSearchResultSet}  invoicesResultSet
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
 * The inline HTML for the cells in each row of the commission_table.
 * (Except the header cell of each row)
 * @returns {String} inlineQty
 */
function tableRowCells() {
    var inlineQty = '<td headers="table_nb_invoices"></td>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_revenue_tax"></td>';
    inlineQty += '<td headers="table_revenue_total"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '<td headers="table_commission_tax"></td>';
    inlineQty += '<td headers="table_commission_total"></td>';

    return inlineQty;
}

/**
 * The inline html code for the commission table.
 * Inserted at the beginning of the pageInit function.
 * @returns {String} inlineQty
 */
function commissionTable() {

    var inlineQty = '<style>';
    // Total rows
    inlineQty += '.total_row.sum_row {background-color: rgba(93, 164, 224, 1);}';
    inlineQty += '.total_row.paid_row {background-color: rgba(93, 164, 224, 0.5);}';
    inlineQty += '.total_row.unpaid_row {background-color: rgba(93, 164, 224, 0.2);}';

    // Services rows
    inlineQty += '.services_row.sum_row {background-color: rgba(245, 180, 112, 1);}';
    inlineQty += '.services_row.paid_row {background-color: rgba(245, 180, 112, 0.5);}';
    inlineQty += '.services_row.unpaid_row {background-color: rgba(245, 180, 112, 0.2);}';

    // Products rows
    inlineQty += '.products_row.sum_row {background-color: rgba(163, 218, 80, 1);}';
    inlineQty += '.products_row.paid_row {background-color: rgba(163, 218, 80, 0.5);}';
    inlineQty += '.products_row.unpaid_row {background-color: rgba(163, 218, 80, 0.2);}';

    // Sum rows
    inlineQty += '.sum_row [headers=table_title], .sum_row [headers=table_revenue_total], .sum_row [headers=table_commission_total]{font-size: medium;}';

    // Headers cells
    inlineQty += '#commission_table th {font-weight: bold;}';
    inlineQty += '</style>';

    inlineQty += '<table class="table" id="commission_table">';
    inlineQty += '<thead>';
    inlineQty += '<tr>';
    inlineQty += '<th scope="col" id="table_title"></th>';
    inlineQty += '<th scope="col" id="table_nb_invoices">Number of invoices</th>';
    inlineQty += '<th scope="col" id="table_revenue">Revenue</th>';
    inlineQty += '<th scope="col" id="table_revenue_tax">Tax</th>';
    inlineQty += '<th scope="col" id="table_revenue_total">Revenue (Total)</th>';
    inlineQty += '<th scope="col" id="table_commission">Commission</th>';
    inlineQty += '<th scope="col" id="table_commission_tax">Tax</th>';
    inlineQty += '<th scope="col" id="table_commission_total">Commission (Total)</th>';
    inlineQty += '</tr>';
    inlineQty += '</thead>';
    inlineQty += '<tbody>';
    inlineQty += '<tr class="total_row sum_row">';
    inlineQty += '<th scope="row" headers="table_title">Total</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '<tr class="total_row paid_row">';
    inlineQty += '<th scope="row" headers="table_title">Paid</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '<tr class="total_row unpaid_row">';
    inlineQty += '<th scope="row" headers="table_title">Unpaid</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '<tr class="services_row sum_row">';
    inlineQty += '<th scope="row" headers="table_title">Services</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '<tr class="services_row paid_row">';
    inlineQty += '<th scope="row" headers="table_title">Paid</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '<tr class="services_row unpaid_row">';
    inlineQty += '<th scope="row" headers="table_title">Unpaid</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '<tr class="products_row sum_row">';
    inlineQty += '<th scope="row" headers="table_title">Products</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '<tr class="products_row paid_row">';
    inlineQty += '<th scope="row" headers="table_title">Paid</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '<tr class="products_row unpaid_row">';
    inlineQty += '<th scope="row" headers="table_title">Unpaid</th>';
    inlineQty += tableRowCells();
    inlineQty += '</tr>';
    inlineQty += '</tbody>';
    inlineQty += '</table>';

    return inlineQty;
}

/**
 * Converts the date string in the "date_to" and "date_from" fields to a correct format for the filter expressions.
 * @param   {String}    date_selected   ex: "2020-06-04"
 * @returns {String}    date_filter     ex: "04/06/2020"
 */
function dateSelected2DateFilter(date_selected) {
    var date_filter = '';
    if (!isNullorEmpty(date_selected)) {
        // date_selected = "2020-06-04"
        var date_array = date_selected.split('-');
        // date_array = ["2020", "06", "04"]
        var year = date_array[0];
        var month = date_array[1];
        var day = date_array[2];
        date_filter = day + '/' + month + '/' + year;
    }

    return date_filter;
}

/**
 * Converts the date string in the "date_to" and "date_from" fields to Javascript Date objects.
 * @param   {String}    date_selected   ex: "2020-06-04"
 * @returns {Date}      date            ex: Thu Jun 04 2020 00:00:00 GMT+1000 (Australian Eastern Standard Time)
 */
function dateSelected2Date(date_selected) {
    // date_selected = "2020-06-04"
    var date_array = date_selected.split('-');
    // date_array = ["2020", "06", "04"]
    var year = date_array[0];
    var month = date_array[1] - 1;
    var day = date_array[2];
    var date = new Date(year, month, day);
    return date;
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