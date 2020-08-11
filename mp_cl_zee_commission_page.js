/**
* Module Description
* 
* NSVersion    Date                Author         
* 2.00         2020-07-23 15:07:00 Raphael
*
* Description: Ability for the franchisee to see the commission they earned for both product as well as services.
*              Show how many invoices got paid and how much commission got for those vs how many are unpaid and how much commission for those.
*              No. of customers as well as the distribution date of the commission.
* 
* @Last Modified by:   raphaelchalicarnemailplus
* @Last Modified time: 2020-07-23 15:07:00
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
var load_record_interval;

// For test
/*
var userRole = 1000;
zee_id = '215';
zee_name = 'Alexandria';
*/

function pageInit() {
    $('div.col-xs-12.commission_table_div').html(commissionTable());

    var zee_id = nlapiGetFieldValue('custpage_zee_id');
    var date_from = nlapiGetFieldValue('custpage_date_from');
    var date_to = nlapiGetFieldValue('custpage_date_to');
    console.log('Parameters on pageInit : ', {
        'zee_id': zee_id,
        'date_from': date_from,
        'date_to': date_to
    });

    var date_from_iso = dateNetsuiteToISO(date_from);
    var date_to_iso = dateNetsuiteToISO(date_to);

    if (!isNullorEmpty(date_from_iso)) {
        $('#date_from').val(date_from_iso);
    }
    if (!isNullorEmpty(date_to_iso)) {
        $('#date_to').val(date_to_iso);
    }
    if (!isNullorEmpty(zee_id) || !isNullorEmpty(date_from) || !isNullorEmpty(date_to)) {
        showLoading();
        loadCommissionTable();
        hideLoading();
    }
    if (!isNullorEmpty($('#period_dropdown option:selected').val())) {
        showLoading();
        selectDate();
        hideLoading();
    }

    $('#zee_dropdown').change(function () {
        showLoading();
        // loadCommissionTable();
        reloadPageWithParams();
        hideLoading();
    });
    $('#period_dropdown').change(function () {
        showLoading();
        selectDate();
        hideLoading();
    });
    $('#date_from, #date_to').change(function () {
        console.log('Reload page with params in #date_from, #date_to change');
        showLoading();
        // loadCommissionTable();
        reloadPageWithParams();
        hideLoading();
        $('#period_dropdown option:selected').attr('selected', false);
    });
}

function saveRecord() {

}

/**
 * Display the loading message.
 * Hide the tables
 */
function showLoading() {
    $('.loading_section').removeClass('hide');
    $('.content_section').addClass('hide');
}

/**
 * Hide the loading message.
 * Display the tables
 */
function hideLoading() {
    $('.loading_section').addClass('hide');
    $('.content_section').removeClass('hide');
}

function reloadPageWithParams() {

    var zee_id = $('#zee_dropdown option:selected').val();
    var date_from = dateISOToNetsuite($('#date_from').val());
    var date_to = dateISOToNetsuite($('#date_to').val());
    var params = {
        zee_id: parseInt(zee_id),
        date_from: date_from,
        date_to: date_to
    };
    params = JSON.stringify(params);
    var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_zee_commission_page', 'customdeploy_sl_zee_commission_page') + '&custparam_params=' + encodeURIComponent(params);
    if (!isNullorEmpty(zee_id)) {
        window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
    }
}

/**
 * Triggered when a Franchisee is selected in the dropdown list.
 */
function loadCommissionTable() {
    $('#operator_results').empty();

    var zee_id = $('#zee_dropdown option:selected').val();
    nlapiSetFieldValue('custpage_zee_id', zee_id);
    var zee_name = $('#zee_dropdown option:selected').text();
    $('.uir-page-title-firstline h1').text('Franchisee ' + zee_name + ' : Commission Page');
    var date_from = dateISOToNetsuite($('#date_from').val());
    var date_to = dateISOToNetsuite($('#date_to').val());

    if (!isNullorEmpty(zee_id)) {
        clearInterval(load_record_interval);
        load_record_interval = setInterval(loadZCPRecord, 15000, zee_id, date_from, date_to);
    }
    console.log('load_record_interval in loadCommissionTable', load_record_interval);
}

/**
 * "ZCP record" stands for "Zee Commission Page record". ('customrecord_zee_commission_page')
 * This record contains the results of the search, and is calculated with the scheduled script 'mp_ss_zee_commission_page'.
 * @param {Number} zee_id 
 * @param {String} date_from 
 * @param {String} date_to 
 */
function loadZCPRecord(zee_id, date_from, date_to) {
    console.log('load_record_interval in loadZCPRecord', load_record_interval);
    var zcp_record_name = 'zee_id:' + zee_id + '_date_from:' + date_from + '_date_to:' + date_to;
    var zcpFilterExpression = new nlobjSearchFilter('name', null, 'is', zcp_record_name);
    var zcp_columns = [];
    zcp_columns[0] = new nlobjSearchColumn('custrecord_nb_invoices_array');
    zcp_columns[1] = new nlobjSearchColumn('custrecord_revenues_tax_array');
    zcp_columns[2] = new nlobjSearchColumn('custrecord_revenues_total_array');
    zcp_columns[3] = new nlobjSearchColumn('custrecord_commissions_tax_array');
    zcp_columns[4] = new nlobjSearchColumn('custrecord_commissions_total_array');
    zcp_columns[5] = new nlobjSearchColumn('custrecord_operator_dict');

    var zcpSearchResults = nlapiSearchRecord('customrecord_zee_commission_page', null, zcpFilterExpression, zcp_columns);
    if (!isNullorEmpty(zcpSearchResults)) {
        var zcpRecord = zcpSearchResults[0];
        var nb_invoices_array = JSON.parse(zcpRecord.getValue('custrecord_nb_invoices_array'));
        var revenues_tax_array = JSON.parse(zcpRecord.getValue('custrecord_revenues_tax_array'));
        var revenues_total_array = JSON.parse(zcpRecord.getValue('custrecord_revenues_total_array'));
        var commissions_tax_array = JSON.parse(zcpRecord.getValue('custrecord_commissions_tax_array'));
        var commissions_total_array = JSON.parse(zcpRecord.getValue('custrecord_commissions_total_array'));
        var operator_dict = JSON.parse(zcpRecord.getValue('custrecord_operator_dict'));

        displayZCPResults(nb_invoices_array, revenues_tax_array, revenues_total_array, commissions_tax_array, commissions_total_array, operator_dict);
    }
}

/**
 * Evaluates the values and displays the results
 * @param {Array}   nb_invoices_array 
 * @param {Array}   revenues_tax_array 
 * @param {Array}   revenues_total_array 
 * @param {Array}   commissions_tax_array 
 * @param {Array}   commissions_total_array 
 * @param {Object}  operator_dict 
 */
function displayZCPResults(nb_invoices_array, revenues_tax_array, revenues_total_array, commissions_tax_array, commissions_total_array, operator_dict) {
    console.log('load_record_interval in displayZCPResults', load_record_interval);
    // Define vars
    var nb_paid_services, nb_unpaid_services, nb_paid_products, nb_unpaid_products;
    var paid_services_revenues_tax, unpaid_services_revenues_tax, paid_products_revenues_tax, unpaid_products_revenues_tax;
    var paid_services_revenues_total, unpaid_services_revenues_total, paid_products_revenues_total, unpaid_products_revenues_total;
    var paid_services_commissions_tax, unpaid_services_commissions_tax, paid_products_commissions_tax, unpaid_products_commissions_tax;
    var paid_services_commissions_total, unpaid_services_commissions_total, paid_products_commissions_total, unpaid_products_commissions_total;

    // Set values
    [nb_paid_services, nb_unpaid_services, nb_paid_products, nb_unpaid_products] = nb_invoices_array;
    [paid_services_revenues_tax, unpaid_services_revenues_tax, paid_products_revenues_tax, unpaid_products_revenues_tax] = revenues_tax_array;
    [paid_services_revenues_total, unpaid_services_revenues_total, paid_products_revenues_total, unpaid_products_revenues_total] = revenues_total_array;
    [paid_services_commissions_tax, unpaid_services_commissions_tax, paid_products_commissions_tax, unpaid_products_commissions_tax] = commissions_tax_array;
    [paid_services_commissions_total, unpaid_services_commissions_total, paid_products_commissions_total, unpaid_products_commissions_total] = commissions_total_array;

    // Transpose arrays
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
    paid_row = [nb_paid_services + nb_paid_products].concat(paid_row);
    unpaid_row = [nb_unpaid_services + nb_unpaid_products].concat(unpaid_row);
    total_row = [nb_paid_services + nb_paid_products + nb_unpaid_services + nb_unpaid_products].concat(total_row);

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

    if (Object.keys(operator_dict).length > 0 && isNullorEmpty(operator_dict["null"])) {
        inlineHtmlOperatorTable = operatorTable(operator_dict);
        $('div.col-xs-12.operator_table_div').html(inlineHtmlOperatorTable);
        $('.operator_table').removeClass('hide');
    }

    $('.commission_table').removeClass('hide');
    clearInterval(load_record_interval);
}

/**
 * Set the values of a row in the commission_table.
 * @param {String}  row_selector    JQuery to select a row in the commission_table
 * @param {Array}   amounts_array   Array of the values to enter in the commission_table selected row.
 */
function setRow(row_selector, amounts_array) {
    var [nb_invoices, revenues, revenues_tax, revenues_total, commissions, commissions_tax, commissions_total] = amounts_array;

    var zee_id = $('#zee_dropdown option:selected').val();
    var date_from = dateISOToNetsuite($('#date_from').val());
    var date_to = dateISOToNetsuite($('#date_to').val());
    var type = 'total';
    var paid = 'all';
    var row_selector_array = row_selector.split(' ')[2].split('.');

    switch (row_selector_array[1]) {
        case 'total_row':
            type = 'total';
            break;
        case 'services_row':
            type = 'services';
            break;
        case 'products_row':
            type = 'products';
            break;
    }

    switch (row_selector_array[2]) {
        case 'sum_row':
            paid = 'all';
            break;

        case 'paid_row':
            paid = 'paid';
            break;

        case 'unpaid_row':
            paid = 'unpaid';
            break;
    }

    var params = {
        zee_id: parseInt(zee_id),
        date_from: date_from,
        date_to: date_to,
        type: type,
        paid: paid
    };
    params = JSON.stringify(params);
    var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_zee_comm_inv_datatable', 'customdeploy_sl_zee_comm_inv_datatable') + '&custparam_params=' + encodeURIComponent(params);
    var inline_link = '<a href="' + upload_url + '">' + nb_invoices + '</a>';

    $(row_selector + ' td[headers="table_nb_invoices"]').html(inline_link);
    $(row_selector + ' td[headers="table_revenue"]').text(revenues);
    $(row_selector + ' td[headers="table_revenue_tax"]').text(revenues_tax);
    $(row_selector + ' td[headers="table_revenue_total"]').text(revenues_total);
    $(row_selector + ' td[headers="table_commission"]').text(commissions);
    $(row_selector + ' td[headers="table_commission_tax"]').text(commissions_tax);
    $(row_selector + ' td[headers="table_commission_total"]').text(commissions_total);
}

/**
 * Calculate the commission and revenue by deducting the tax from the total amount.
 * @param   {Array} amount_row  (length 2 or 4)
 * @returns {Array} amount_row  (length 3 or 6)
 */
function calculateWithoutTax(amount_row) {
    var array_length = amount_row.length;
    if (array_length == 4) {
        var [revenues_tax, revenues_total, commissions_tax, commissions_total] = amount_row;
        var revenues = revenues_total - revenues_tax;
        var commission = commissions_total - commissions_tax;
        return [revenues, revenues_tax, revenues_total, commission, commissions_tax, commissions_total];
    } else if (array_length == 2) {
        var [commissions_tax, commissions_total] = amount_row;
        var commission = commissions_total - commissions_tax;
        return [commission, commissions_tax, commissions_total];
    }
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
    // loadCommissionTable();
    reloadPageWithParams();
}

/**
 * Load the result set of the bill records linked to the Franchisee.
 * @param   {String}                zee_id
 * @param   {String}                date_from
 * @param   {String}                date_to
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
 * @param   {Number} invoice_id
 * @return  {nlobjSearchResultSet} barcodeResultSet
 */
function loadBarcodesSearch(invoice_id) {
    var barcodesSearch = nlapiLoadSearch('customrecord_customer_product_stock', 'customsearch_zee_commission_page_2');
    var barcodeFilterExpression = barcodesSearch.getFilterExpression();
    barcodeFilterExpression.push('AND', ['custrecord_prod_stock_invoice', 'is', invoice_id]);
    barcodesSearch.setFilterExpression(barcodeFilterExpression);
    var barcodeResultSet = barcodesSearch.runSearch();

    return barcodeResultSet;
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
    inlineQty += '.sum_row [headers=table_title], .sum_row [headers=table_revenue_total], .sum_row [headers=table_commission_total] {font-size: medium;}';

    // Headers cells
    inlineQty += '#commission_table th {font-weight: bold;}';

    // Links
    inlineQty += '#commission_table a {color: #24385b;}';
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

function operatorTable(operator_dict) {
    var operator_id_array = Object.keys(operator_dict);

    var inlineQty = '<style>';
    /*Operator rows*/
    inlineQty += '#operator_table .sum_row {background-color: rgba(128,128,128, 0.8);}';
    inlineQty += '#operator_table .paid_row {background-color: rgba(128,128,128, 0.5);}';
    inlineQty += '#operator_table .unpaid_row {background-color: rgba(128,128,128, 0.2);}';

    /* Sum rows */
    inlineQty += '.sum_row [headers=table_operator_title], .sum_row [headers=table_operator_commission_total] {font-size: medium;}';

    /* Headers cells */
    inlineQty += '#operator_table th {font-weight: bold;}';
    inlineQty += '</style>';

    inlineQty += '<table class="table" id="operator_table">'
    inlineQty += '<thead>'
    inlineQty += '<tr>'
    inlineQty += '<th scope="col" id="table_operator_title"></th>'
    inlineQty += '<th scope="col" id="table_operator_commission">Commission</th>'
    inlineQty += '<th scope="col" id="table_operator_commission_tax">Tax</th>'
    inlineQty += '<th scope="col" id="table_operator_commission_total">Commission (Total)</th>'
    inlineQty += '</tr>'
    inlineQty += '</thead>'
    inlineQty += '<tbody id="operator_results">'

    operator_id_array.forEach(function (operator_id) {
        var operator_object = operator_dict[operator_id];
        var operator_name = operator_object.name;
        var paid_row = [operator_object.tax_paid_amount, operator_object.total_paid_amount];
        var unpaid_row = [operator_object.tax_unpaid_amount, operator_object.total_unpaid_amount];

        paid_row = calculateWithoutTax(paid_row);
        unpaid_row = calculateWithoutTax(unpaid_row);
        var sum_row = sum2arrays(paid_row, unpaid_row);

        paid_row = paid_row.map(financial);
        unpaid_row = unpaid_row.map(financial);
        sum_row = sum_row.map(financial);

        inlineQty += '<tr class="' + operator_id + '_row sum_row">';
        inlineQty += '<th scope="row" headers="table_operator_title">' + operator_name + '</th >'
        inlineQty += '<td headers="table_operator_commission">' + sum_row[0] + '</td>'
        inlineQty += '<td headers="table_operator_commission_tax">' + sum_row[1] + '</td>'
        inlineQty += '<td headers="table_operator_commission_total">' + sum_row[2] + '</td>'
        inlineQty += '</tr>'
        inlineQty += '<tr class="' + operator_id + '_row paid_row">'
        inlineQty += '<th scope="row" headers="table_operator_title">Paid</th>'
        inlineQty += '<td headers="table_operator_commission">' + paid_row[0] + '</td>'
        inlineQty += '<td headers="table_operator_commission_tax">' + paid_row[1] + '</td>'
        inlineQty += '<td headers="table_operator_commission_total">' + paid_row[2] + '</td>'
        inlineQty += '</tr>'
        inlineQty += '<tr class="' + operator_id + '_row unpaid_row">'
        inlineQty += '<th scope="row" headers="table_operator_title">Unpaid</th>'
        inlineQty += '<td headers="table_operator_commission">' + unpaid_row[0] + '</td>'
        inlineQty += '<td headers="table_operator_commission_tax">' + unpaid_row[1] + '</td>'
        inlineQty += '<td headers="table_operator_commission_total">' + unpaid_row[2] + '</td>'
        inlineQty += '</tr>'
    });

    inlineQty += '</tbody>'
    inlineQty += '</table>'

    return inlineQty;
}

/**
 * Converts the date string in the "date_to" and "date_from" fields to a correct format for the filter expressions.
 * @param   {String}    date_selected   ex: "2020-06-04"
 * @returns {String}    date_filter     ex: "04/06/2020"
 */
/*
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
*/

/**
 * Converts the date string in the "date_to" and "date_from" fields to Javascript Date objects.
 * @param   {String}    date_selected   ex: "2020-06-04"
 * @returns {Date}      date            ex: Thu Jun 04 2020 00:00:00 GMT+1000 (Australian Eastern Standard Time)
 */
/*
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
*/

/**
 * @param   {String} date_netsuite  "1/6/2020"
 * @returns {String} date_iso       "2020-06-01"
 */
function dateNetsuiteToISO(date_netsuite) {
    var date_iso = '';
    if (!isNullorEmpty(date_iso)) {
        var date = nlapiStringToDate(date_netsuite);
        var date_day = date.getDate();
        var date_month = date.getMonth();
        var date_year = date.getFullYear();
        var date_utc = new Date(Date.UTC(date_year, date_month, date_day));
        date_iso = date_utc.toISOString().split('T')[0];
    }
    return date_iso;
}

/**
 * @param   {String} date_iso       "2020-06-01"
 * @returns {String} date_netsuite  "1/6/2020"
 */
function dateISOToNetsuite(date_iso) {
    var date_netsuite = '';
    if (!isNullorEmpty(date_iso)) {
        var date_utc = new Date(date_iso);
        var date_netsuite = nlapiDateToString(date_utc);
    }
    return date_netsuite;
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