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
* @Last Modified time: 2020-07-21 11:17:00
*
*/

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var zee_id = null;
var ctx = nlapiGetContext();
var userRole = parseInt(ctx.getRole());
if (userRole == 1000) {
    zee_id = ctx.getUser();
}

// For test
/*
var userRole = 1000;
zee_id = '215';
zee_name = 'Alexandria';
*/

function showCommissions(request, response) {
    if (request.getMethod() == "GET") {

        var zee_name = '';
        var date_from = '';
        var date_to = '';

        // Load params
        var params = request.getParameter('custparam_params');
        if (!isNullorEmpty(params)) {
            params = JSON.parse(params);
            zee_id = parseInt(params.zee_id);
            date_from = dateFilter2DateSelected(params.date_from);
            date_to = dateFilter2DateSelected(params.date_to);
        }

        if (!isNullorEmpty(zee_id)) {
            var zeeRecord = nlapiLoadRecord('partner', zee_id);
            var zee_name = zeeRecord.getFieldValue('companyname');
        }

        var form = nlapiCreateForm('Franchisee ' + zee_name + ' : commissions page');

        // Load jQuery
        var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';

        // Load Bootstrap
        inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
        inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';

        // Load DataTables
        // inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
        // inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';

        // Load Netsuite stylesheet and script
        inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
        inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
        inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
        inlineHtml += '<style>.mandatory{color:red;}</style>';

        inlineHtml += franchiseeDropdownSection();
        inlineHtml += periodDropdownSection();
        inlineHtml += dateFilterSection();
        inlineHtml += commissionTable();

        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setLayoutType('midrow').setDefaultValue(inlineHtml);
        form.addField('custpage_zee_id', 'text', 'Franchisee ID').setDisplayType('hidden').setDefaultValue(zee_id);
        form.addField('custpage_date_from', 'text', 'Date from').setDisplayType('hidden').setDefaultValue(date_from);
        form.addField('custpage_date_to', 'text', 'Date to').setDisplayType('hidden').setDefaultValue(date_to);
        // form.addSubmitButton('Update Ticket');
        form.setScript('customscript_cl_zee_commission_page');
        response.writePage(form);
    } else {
        nlapiSetRedirectURL('SUITELET', 'customscript_sl_zee_commission_page', 'customdeploy_sl_zee_commission_page', null, null);
    }
}

/**
 * The Franchisee dropdown list.
 * @return  {String}    inlineQty
 */
function franchiseeDropdownSection() {
    // The dropdown is hidden to the user if it's a Franchisee.
    if (userRole == 1000) {
        var inlineQty = '<div class="form-group container zee_dropdown_section hide">';
    } else {
        var inlineQty = '<div class="form-group container zee_dropdown_section">';
    }

    inlineQty += '<div class="row">';
    // Franchisee dropdown field
    inlineQty += '<div class="col-xs-12 zee_dropdown_div">';
    inlineQty += '<div class="input-group">';
    inlineQty += '<span class="input-group-addon" id="zee_dropdown_text">FRANCHISEE</span>';
    if (userRole == 1000) {
        inlineQty += '<select id="zee_dropdown" class="form-control" disabled>';
    } else {
        inlineQty += '<select id="zee_dropdown" class="form-control">';
    }
    inlineQty += '<option></option>';

    // Load the franchisees options
    var zeesSearch = nlapiLoadSearch('partner', 'customsearch907');
    var zeesSearchResults = zeesSearch.runSearch();
    zeesSearchResults.forEachResult(function (zeesSearchResult) {
        var opt_zee_id = zeesSearchResult.getValue("internalid", null, "GROUP");
        var opt_zee_name = zeesSearchResult.getValue("companyname", null, "GROUP");
        if (opt_zee_id == zee_id) {
            inlineQty += '<option value="' + opt_zee_id + '" selected>' + opt_zee_name + '</option>';
        } else {
            inlineQty += '<option value="' + opt_zee_id + '">' + opt_zee_name + '</option>';
        }
        return true;
    });

    inlineQty += '</select>';
    inlineQty += '</div></div></div></div>';

    return inlineQty;
}

/**
 * The period dropdown field.
 * @return  {String}    inlineQty
 */
function periodDropdownSection() {
    var inlineQty = '<div class="form-group container period_dropdown_section">';
    inlineQty += '<div class="row">';
    // Period dropdown field
    inlineQty += '<div class="col-xs-12 period_dropdown_div">';
    inlineQty += '<div class="input-group">';
    inlineQty += '<span class="input-group-addon" id="period_dropdown_text">PERIOD</span>';
    inlineQty += '<select id="period_dropdown" class="form-control">';
    inlineQty += '<option></option>';
    inlineQty += '<option value="this_week">This Week</option>';
    inlineQty += '<option value="last_week">Last Week</option>';
    inlineQty += '<option value="this_month">This Month</option>';
    inlineQty += '<option value="last_month">Last Month</option>';
    inlineQty += '<option value="full_year">Full Year (1 Jan -)</option>';
    inlineQty += '<option value="financial_year">Financial Year (1 Jul -)</option>';
    inlineQty += '</select>';
    inlineQty += '</div></div></div></div>';

    return inlineQty;
}

/**
 * The date input fields to filter the invoices.
 * @return  {String}    inlineQty
 */
function dateFilterSection() {

    var inlineQty = '<div class="form-group container date_filter_section">';
    inlineQty += '<div class="row">';
    // Date from field
    inlineQty += '<div class="col-xs-6 date_from">';
    inlineQty += '<div class="input-group">';
    inlineQty += '<span class="input-group-addon" id="date_from_text">FROM</span>';
    inlineQty += '<input id="date_from" class="form-control date_from" type="date"/>';
    inlineQty += '</div></div>';
    // Date to field
    inlineQty += '<div class="col-xs-6 date_to">';
    inlineQty += '<div class="input-group">';
    inlineQty += '<span class="input-group-addon" id="date_to_text">TO</span>';
    inlineQty += '<input id="date_to" class="form-control date_to" type="date">';
    inlineQty += '</div></div></div></div>';

    return inlineQty;
}

/**
 * The table of the revenues and commissions.
 * @return  {String}    inlineQty
 */
function commissionTable() {
    var inlineQty = '<div class="form-group container commission_table hide" style="font-size: small;">';
    inlineQty += '<div class="row">';
    inlineQty += '<div class="col-xs-12 commission_table_div">';
    // The HTML code for the table is inserted with JQuery in the pageInit function of the mp_cl_commission_page script.
    inlineQty += '</div></div></div>';

    return inlineQty;
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