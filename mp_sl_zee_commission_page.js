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
* @Last Modified time: 2020-08-12 12:47:00
*
*/

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var zee_id = '';
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
        var timestamp = '';

        if (userRole == 1000) {
            [date_from, date_to] = getLastMonthDates();
        }

        // Load params
        var params = request.getParameter('custparam_params');
        if (!isNullorEmpty(params)) {
            params = JSON.parse(params);
            zee_id = parseInt(params.zee_id);
            date_from = params.date_from;
            date_to = params.date_to;
            nlapiLogExecution('DEBUG', 'Param zee_id', zee_id);
            nlapiLogExecution('DEBUG', 'Param date_from', date_from);
            nlapiLogExecution('DEBUG', 'Param date_to', date_to);
        }

        nlapiLogExecution('DEBUG', 'zee_id after param', zee_id);
        nlapiLogExecution('DEBUG', 'date_from after param', date_from);
        nlapiLogExecution('DEBUG', 'date_to after param', date_to);

        if (!isNullorEmpty(zee_id)) {
            var zeeRecord = nlapiLoadRecord('partner', zee_id);
            var zee_name = zeeRecord.getFieldValue('companyname');
            timestamp = Date.now().toString();
            nlapiLogExecution('DEBUG', 'timestamp', timestamp);
            var ss_params = {
                custscript_zcp_zee_id: zee_id,
                custscript_date_from: date_from,
                custscript_date_to: date_to,
                custscript_timestamp3: timestamp,
                custscript_main_index: 0,
                custscript_nb_invoices_array: JSON.stringify([0, 0, 0, 0]),
                custscript_revenues_tax_array: JSON.stringify([0, 0, 0, 0]),
                custscript_revenues_total_array: JSON.stringify([0, 0, 0, 0]),
                custscript_commissions_tax_array: JSON.stringify([0, 0, 0, 0]),
                custscript_commissions_total_array: JSON.stringify([0, 0, 0, 0]),
                custscript_bills_id_set: JSON.stringify([]),
                custscript_operator_dict: JSON.stringify({})
            };
            nlapiLogExecution('DEBUG', 'ss_params', JSON.stringify(ss_params));
            // This scheduled script will calculate the commissions and revenues earned by the Franchisee `zee_id` during the period
            // between `date_from` and `date_to`. A timestamp is added to make sure we will get the results from a unique record, as 
            // a query with the same parameters might display different results if it is called later on.
            var status = nlapiScheduleScript('customscript_ss_zee_commission_page', 'customdeploy_ss_zee_commission_page', ss_params);
            nlapiLogExecution('DEBUG', 'Scheduled script scheduled', status);
        }

        var form = nlapiCreateForm('Franchisee ' + zee_name + ' : Commissions Page');

        // Load jQuery
        var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';

        // Load Bootstrap
        inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
        inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';

        // Load Netsuite stylesheet and script
        inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
        inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
        inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
        inlineHtml += '<style>.mandatory{color:red;}</style>';

        inlineHtml += franchiseeDropdownSection(zee_id);
        inlineHtml += periodDropdownSection(date_from, date_to);
        inlineHtml += dateFilterSection();
        inlineHtml += loadingSection(zee_id, date_from, date_to);
        inlineHtml += '<div class="form-group container content_section hide">';
        inlineHtml += commissionTable();
        inlineHtml += operatorTable();
        inlineHtml += '</div>';

        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setLayoutType('midrow').setDefaultValue(inlineHtml);
        form.addField('custpage_zee_id', 'text', 'Franchisee ID').setDisplayType('hidden').setDefaultValue(zee_id);
        form.addField('custpage_date_from', 'text', 'Date from').setDisplayType('hidden').setDefaultValue(date_from);
        form.addField('custpage_date_to', 'text', 'Date to').setDisplayType('hidden').setDefaultValue(date_to);
        form.addField('custpage_timestamp', 'text', 'Date to').setDisplayType('hidden').setDefaultValue(timestamp);
        form.addField('custpage_operator_id', 'text', 'Operator ID').setDisplayType('hidden');
        form.setScript('customscript_cl_zee_commission_page');
        response.writePage(form);
    } else {
        zee_id = request.getParameter('custpage_zee_id');
        var date_from = request.getParameter('custpage_date_from');
        var date_to = request.getParameter('custpage_date_to');
        var timestamp = request.getParameter('custpage_timestamp');

        var zcp_params = {
            custparam_zee_id: zee_id,
            custparam_date_from: date_from,
            custparam_date_to: date_to,
            custparam_timestamp: timestamp
        }
        nlapiSetRedirectURL('SUITELET', 'customscript_sl_zee_commission_page', 'customdeploy_sl_zee_commission_page', null, zcp_params);
    }
}

/**
 * The header showing that the results are loading.
 * The loading message is shown to the user only if there is a `zee_id` parameter and at least one of the two date parameters.
 * In that case, the scheduled script has been called and a result will be displayed.
 * @param   {Number} zee_id 
 * @param   {String} date_from 
 * @param   {String} date_to 
 * @returns {String} `inlineQty`
 */
function loadingSection(zee_id, date_from, date_to) {
    var hide_loading_section = (!isNullorEmpty(zee_id) && (!isNullorEmpty(date_from) || !isNullorEmpty(date_to))) ? '' : 'hide';
    var inlineQty = '<div class="form-group container loading_section ' + hide_loading_section + '" style="text-align:center">';
    inlineQty += '<div class="row">';
    inlineQty += '<div class="col-xs-12 loading_div">';
    inlineQty += '<h1>Loading...</h1>';
    inlineQty += '</div></div></div>';

    return inlineQty;
}

/**
 * The Franchisee dropdown list.
 * @param   {Number}    zee_id
 * @return  {String}    `inlineQty`
 */
function franchiseeDropdownSection(zee_id) {
    // The dropdown is hidden to the user if it's a Franchisee.
    var hide_zee_section = (userRole == 1000) ? 'hide' : '';
    var disabled_dropdown = (userRole == 1000) ? 'disabled' : '';

    var inlineQty = '<div class="form-group container zee_dropdown_section ' + hide_zee_section + '">';

    inlineQty += '<div class="row">';
    // Franchisee dropdown field
    inlineQty += '<div class="col-xs-12 zee_dropdown_div">';
    inlineQty += '<div class="input-group">';
    inlineQty += '<span class="input-group-addon" id="zee_dropdown_text">FRANCHISEE</span>';
    inlineQty += '<select id="zee_dropdown" class="form-control" ' + disabled_dropdown + '>';
    inlineQty += '<option></option>';

    // Load the franchisees options
    var zeesSearch = nlapiLoadSearch('partner', 'customsearch907');
    var zeesSearchResults = zeesSearch.runSearch();
    zeesSearchResults.forEachResult(function (zeesSearchResult) {
        var opt_zee_id = zeesSearchResult.getValue("internalid", null, "GROUP");
        var opt_zee_name = zeesSearchResult.getValue("companyname", null, "GROUP");
        var selected_option = (opt_zee_id == zee_id) ? 'selected' : '';
        inlineQty += '<option value="' + opt_zee_id + '" ' + selected_option + '>' + opt_zee_name + '</option>';
        return true;
    });

    inlineQty += '</select>';
    inlineQty += '</div></div></div></div>';

    return inlineQty;
}

/**
 * The period dropdown field.
 * @param   {String}    date_from
 * @param   {String}    date_to
 * @return  {String}    `inlineQty`
 */
function periodDropdownSection(date_from, date_to) {
    var selected_option = (isNullorEmpty(date_from) && isNullorEmpty(date_to)) ? 'selected' : '';
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
    inlineQty += '<option value="last_month" ' + selected_option + '>Last Month</option>';
    inlineQty += '<option value="full_year">Full Year (1 Jan -)</option>';
    inlineQty += '<option value="financial_year">Financial Year (1 Jul -)</option>';
    inlineQty += '</select>';
    inlineQty += '</div></div></div></div>';

    return inlineQty;
}

/**
 * The date input fields to filter the invoices.
 * Even if the parameters `date_from` and `date_to` are defined, they can't be initiated in the HTML code.
 * They are initiated with jQuery in the `pageInit()` function.
 * @return  {String} `inlineQty`
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
 * @return  {String} `inlineQty`
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
 * The table of commissions sorted by operator.
 * @return  {String} `inlineQty`
 */
function operatorTable() {
    var inlineQty = '<div class="form-group container operator_table hide" style="font-size: small;">';
    inlineQty += '<div class="row">';
    inlineQty += '<div class="col-xs-12 operator_table_div">';
    // The HTML code for the table is inserted with JQuery in the pageInit function of the mp_cl_commission_page script.
    inlineQty += '</div></div></div>';

    return inlineQty;
}

/**
 * For client side scripts, the string returned is based on the user’s system time. 
 * For server-side scripts, the string returned is based on the current time in the Pacific Time Zone. 
 * Note that Daylight Savings Time does apply.
 * 
 * To make sure that `first_day_previous_month` and `date_from_last_month` are converted to the wanted date
 * in `nlapiDateToString()`, 8 hours are added to those dates. 
 * That is because the Pacific Time Zone is 7 or 8 hours behind UTC, depending on the season.
 */
function getLastMonthDates() {
    // Wed Aug 12 2020 22:22:04 GMT-0700 (PDT) in the Suitelet script
    // Thu Aug 13 2020 15:22:04 GMT+1000 (Australian Eastern Standard Time) in Sydney
    var today = new Date();
    var today_month = today.getUTCMonth();      // 7 (August, since the months start at 0 with January)
    var today_year = today.getUTCFullYear();    // 2020

    // Get the first day of the previous month (on the UTC timezone)
    // Tue Jun 30 2020 17:00:00 GMT-0700 (PDT) in the Suitelet script
    // Wed Jul 01 2020 10:00:00 GMT+1000 (Australian Eastern Standard Time)
    var first_day_previous_month = new Date(Date.UTC(today_year, today_month - 1));
    // Wed Jul 01 2020 01:00:00 GMT-0700 (PDT) in the Suitelet script
    // Wed Jul 01 2020 18:00:00 GMT+1000 (Australian Eastern Standard Time)
    first_day_previous_month.setHours(first_day_previous_month.getHours() + 8)

    // Get the last day of the previous month (on the UTC timezone)
    // Thu Jul 30 2020 17:00:00 GMT-0700 (PDT) in the Suitelet script
    // Fri Jul 31 2020 10:00:00 GMT+1000 (Australian Eastern Standard Time)
    var last_day_previous_month = new Date(Date.UTC(today_year, today_month, 0));
    // Fri Jul 31 2020 01:00:00 GMT-0700 (PDT) in the Suitelet script
    // Fri Jul 31 2020 18:00:00 GMT+1000 (Australian Eastern Standard Time)
    last_day_previous_month.setHours(last_day_previous_month.getHours() + 8)

    // Convert Date Object to Netsuite date string.
    var date_from_last_month = nlapiDateToString(first_day_previous_month); // "1/7/2020"
    var date_to_last_month = nlapiDateToString(last_day_previous_month);    // "31/7/2020"
    return [date_from_last_month, date_to_last_month];
}