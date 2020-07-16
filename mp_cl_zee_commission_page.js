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
    $('#date_from, #date_to').change(function () { 
        loadCommissionTable();
        $('#period_dropdown option:selected').attr('selected', false);
    });
    $('#period_dropdown').change(function () { selectDate() });
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

        var paid_services_revenues = null;
        var unpaid_services_revenues = null;
        var paid_products_revenues = null;
        var unpaid_products_revenues = null;

        var paid_services_commissions = null;
        var unpaid_services_commissions = null;
        var paid_products_commissions = null;
        var unpaid_products_commissions = null;

        if (!isNullorEmpty(billResultSet)) {
            billResultSet.forEachResult(function (billResult) {
                // console.log('billResult : ', billResult);

                var invoice_number = billResult.getText('custbody_invoice_reference');
                var bill_number = billResult.getValue('invoicenum');
                var invoice_type = billResult.getValue('custbody_related_inv_type');
                var invoice_status = billResult.getValue('statusref');
                var total_amount = parseFloat(billResult.getValue('custbody_invoicetotal'));    // Revenues
                var billing_amount = parseFloat(billResult.getValue('amount')); // Commissions

                console.log({
                    invoice_number: invoice_number,
                    bill_number: bill_number,
                    invoice_type: invoice_type,
                    invoice_status: invoice_status,
                    total_amount: total_amount,
                    billing_amount: billing_amount
                });

                if (isNullorEmpty(invoice_type)) {
                    // Services
                    switch (invoice_status) {
                        case 'open':        // unpaid
                            unpaid_services_revenues += total_amount;
                            unpaid_services_commissions += billing_amount;
                            console.log('Bill number ' + bill_number + ' : Unpaid Services');
                            break;

                        case 'paidInFull':  // paid
                            paid_services_revenues += total_amount;
                            paid_services_commissions += billing_amount;
                            console.log('Bill number ' + bill_number + ' : Paid Services');
                            break;

                        default:
                            break;
                    }
                } else {
                    // Products
                    switch (invoice_status) {
                        case 'open':        // unpaid
                            unpaid_products_revenues += total_amount;
                            unpaid_products_commissions += billing_amount;
                            console.log('Bill number ' + bill_number + ' : Unpaid Products');
                            break;

                        case 'paidInFull':  // paid
                            paid_products_revenues += total_amount;
                            paid_products_commissions += billing_amount;
                            console.log('Bill number ' + bill_number + ' : Paid Products');
                            break;

                        default:
                            break;
                    }
                }
                return true;
            });
        }

        var paid_revenues = paid_services_revenues + paid_products_revenues;
        var unpaid_revenues = unpaid_services_revenues + unpaid_products_revenues;
        var paid_commissions = paid_services_commissions + paid_products_commissions;
        var unpaid_commissions = unpaid_services_commissions + unpaid_products_commissions;
        var revenues = paid_revenues + unpaid_revenues;
        var commissions = paid_commissions + unpaid_commissions;

        paid_revenues = financial(paid_revenues);
        unpaid_revenues = financial(unpaid_revenues);
        paid_commissions = financial(paid_commissions);
        unpaid_commissions = financial(unpaid_commissions);
        revenues = financial(revenues);
        commissions = financial(commissions);

        var services_revenues = paid_services_revenues + unpaid_services_revenues;
        var services_commissions = paid_services_commissions + unpaid_services_commissions;
        var products_revenues = paid_products_revenues + unpaid_products_revenues;
        var products_commissions = paid_products_commissions + unpaid_products_commissions;

        services_revenues = financial(services_revenues);
        services_commissions = financial(services_commissions);
        products_revenues = financial(products_revenues);
        products_commissions = financial(products_commissions);

        paid_services_revenues = financial(paid_services_revenues);
        unpaid_services_revenues = financial(unpaid_services_revenues);
        paid_products_revenues = financial(paid_products_revenues);
        unpaid_products_revenues = financial(unpaid_products_revenues);

        paid_services_commissions = financial(paid_services_commissions);
        unpaid_services_commissions = financial(unpaid_services_commissions);
        paid_products_commissions = financial(paid_products_commissions);
        unpaid_products_commissions = financial(unpaid_products_commissions);

        console.log('paid_services_revenues', paid_services_revenues);
        console.log('unpaid_services_revenues', unpaid_services_revenues);
        console.log('paid_products_revenues', paid_products_revenues);
        console.log('unpaid_products_revenues', unpaid_products_revenues);

        console.log('paid_services_commissions', paid_services_commissions);
        console.log('unpaid_services_commissions', unpaid_services_commissions);
        console.log('paid_products_commissions', paid_products_commissions);
        console.log('unpaid_products_commissions', unpaid_products_commissions);

        // Total
        $('#commission_table tbody tr.total_row.sum_row td[headers="table_revenue"]').text(revenues);
        $('#commission_table tbody tr.total_row.sum_row td[headers="table_commission"]').text(commissions);

        $('#commission_table tbody tr.total_row.paid_row td[headers="table_revenue"]').text(paid_revenues);
        $('#commission_table tbody tr.total_row.paid_row td[headers="table_commission"]').text(paid_commissions);

        $('#commission_table tbody tr.total_row.unpaid_row td[headers="table_revenue"]').text(unpaid_revenues);
        $('#commission_table tbody tr.total_row.unpaid_row td[headers="table_commission"]').text(unpaid_commissions);

        // Services
        $('#commission_table tbody tr.services_row.sum_row td[headers="table_revenue"]').text(services_revenues);
        $('#commission_table tbody tr.services_row.sum_row td[headers="table_commission"]').text(services_commissions);

        $('#commission_table tbody tr.services_row.paid_row td[headers="table_revenue"]').text(paid_services_revenues);
        $('#commission_table tbody tr.services_row.paid_row td[headers="table_commission"]').text(paid_services_commissions);

        $('#commission_table tbody tr.services_row.unpaid_row td[headers="table_revenue"]').text(unpaid_services_revenues);
        $('#commission_table tbody tr.services_row.unpaid_row td[headers="table_commission"]').text(unpaid_services_commissions);

        // Products
        $('#commission_table tbody tr.products_row.sum_row td[headers="table_revenue"]').text(products_revenues);
        $('#commission_table tbody tr.products_row.sum_row td[headers="table_commission"]').text(products_commissions);

        $('#commission_table tbody tr.products_row.paid_row td[headers="table_revenue"]').text(paid_products_revenues);
        $('#commission_table tbody tr.products_row.paid_row td[headers="table_commission"]').text(paid_products_commissions);

        $('#commission_table tbody tr.products_row.unpaid_row td[headers="table_revenue"]').text(unpaid_products_revenues);
        $('#commission_table tbody tr.products_row.unpaid_row td[headers="table_commission"]').text(unpaid_products_commissions);

        $('.commission_table').removeClass('hide');
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
 * The inline html code for the commission table.
 * Inserted at the beginning of the pageInit function.
 * @returns {String} inlineQty
 */
function commissionTable() {
    var inlineQty = '<style>/* Total rows */.total_row.sum_row {background-color: rgba(93, 164, 224, 1);}.total_row.paid_row {background-color: rgba(93, 164, 224, 0.5);}.total_row.unpaid_row {background-color: rgba(93, 164, 224, 0.2);}/* Services rows */.services_row.sum_row {background-color: rgba(245, 180, 112, 1);}.services_row.paid_row {background-color: rgba(245, 180, 112, 0.5);}.services_row.unpaid_row {background-color: rgba(245, 180, 112, 0.2);}/* Products rows */.products_row.sum_row {background-color: rgba(163, 218, 80, 1);}.products_row.paid_row {background-color: rgba(163, 218, 80, 0.5);}.products_row.unpaid_row {background-color: rgba(163, 218, 80, 0.2);}/* Sum rows */.sum_row {font-size: medium;}/* Headers cells */#commission_table th {font-weight: bold;}</style>';

    inlineQty += '<table class="table" id="commission_table">';
    inlineQty += '<thead>';
    inlineQty += '<tr>';
    inlineQty += '<th scope="col" id="table_title"></th>';
    inlineQty += '<th scope="col" id="table_revenue">Revenue</th>';
    inlineQty += '<th scope="col" id="table_commission">Commission</th>';
    inlineQty += '</tr>';
    inlineQty += '</thead>';
    inlineQty += '<tbody>';
    inlineQty += '<tr class="total_row sum_row">';
    inlineQty += '<th scope="row" headers="table_title">Total</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '</tr>';
    inlineQty += '<tr class="total_row paid_row">';
    inlineQty += '<th scope="row" headers="table_title">Paid</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '</tr>';
    inlineQty += '<tr class="total_row unpaid_row">';
    inlineQty += '<th scope="row" headers="table_title">Unpaid</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '</tr>';
    inlineQty += '<tr class="services_row sum_row">';
    inlineQty += '<th scope="row" headers="table_title">Services</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '</tr>';
    inlineQty += '<tr class="services_row paid_row">';
    inlineQty += '<th scope="row" headers="table_title">Paid</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '</tr>';
    inlineQty += '<tr class="services_row unpaid_row">';
    inlineQty += '<th scope="row" headers="table_title">Unpaid</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '</tr>';
    inlineQty += '<tr class="products_row sum_row">';
    inlineQty += '<th scope="row" headers="table_title">Products</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '</tr>';
    inlineQty += '<tr class="products_row paid_row">';
    inlineQty += '<th scope="row" headers="table_title">Paid</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
    inlineQty += '</tr>';
    inlineQty += '<tr class="products_row unpaid_row">';
    inlineQty += '<th scope="row" headers="table_title">Unpaid</th>';
    inlineQty += '<td headers="table_revenue"></td>';
    inlineQty += '<td headers="table_commission"></td>';
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