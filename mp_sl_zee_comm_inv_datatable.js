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

var zee_id = null;
var zee_name = '';
var ctx = nlapiGetContext();
var userRole = parseInt(ctx.getRole());
if (userRole == 1000) {
    zee_id = parseInt(ctx.getUser());
    zee_name = ctx.getName();
}

function showInvoicesList(request, response) {
    if (request.getMethod() == "GET") {

        var date_from = '';
        var date_to = '';
        var type = 'total';
        var paid = 'all';

        // Load params
        var params = request.getParameter('custparam_params');
        if (!isNullorEmpty(params)) {
            params = JSON.parse(params);
            zee_id = parseInt(params.zee_id);
            date_from = params.date_from;
            date_to = params.date_to;
            type = params.type;
            paid = params.paid;
        }

        var zeeRecord = nlapiLoadRecord('partner', zee_id);
        var zee_name = zeeRecord.getFieldValue('companyname');

        var paid_title = '';
        switch (paid) {
            case 'all':
                paid_title = '';
                break;

            case 'paid':
                paid_title = 'paid';
                break;

            case 'unpaid':
                paid_title = 'unpaid';
                break;
        }

        var type_title = '';
        switch (type) {
            case 'total':
                type_title = '';
                break;
            case 'services':
                type_title = 'services';
                break;
            case 'products':
                type_title = 'products';
                break;
        }
        if (type == 'total' && paid == 'all') {
            var form = nlapiCreateForm('Franchisee ' + zee_name + ' : All columns');
        } else {
            var form = nlapiCreateForm('Franchisee ' + zee_name + ' : ' + paid_title + ' ' + type_title + ' detail');
        }

        // Load jQuery
        var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';

        // Load Bootstrap
        inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
        inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';

        // Load DataTables
        inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
        inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';

        // Load Netsuite stylesheet and script
        inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
        inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
        inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
        inlineHtml += '<style>.mandatory{color:red;}</style>';

        inlineHtml += dataTablePreview();

        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setLayoutType('midrow').setDefaultValue(inlineHtml);
        form.addField('custpage_zee_id', 'text', 'Franchisee ID').setDisplayType('hidden').setDefaultValue(zee_id);
        form.addField('custpage_date_from', 'text', 'Date from').setDisplayType('hidden').setDefaultValue(date_from);
        form.addField('custpage_date_to', 'text', 'Date to').setDisplayType('hidden').setDefaultValue(date_to);
        form.addField('custpage_type', 'text', 'Type').setDisplayType('hidden').setDefaultValue(type);
        form.addField('custpage_paid', 'text', 'Paid').setDisplayType('hidden').setDefaultValue(paid);
        form.addButton('custpage_back', 'Back', 'onBack()');
        form.setScript('customscript_cl_zee_comm_inv_datatable');
        response.writePage(form);
    } else {
        nlapiSetRedirectURL('SUITELET', 'customscript_sl_zee_comm_inv_datatable', 'customdeploy_sl_zee_comm_inv_datatable', null, null);
    }
}

/**
 * The table that will display the differents invoices linked to the franchisee and the time period.
 * @return  {String}    inlineQty
 */
function dataTablePreview() {
    var inlineQty = '<style>table#bills-preview {font-size: 12px;text-align: center;border: none;}.dataTables_wrapper {font-size: 14px;}table#bills-preview th{text-align: center;}</style>';
    inlineQty += '<table cellpadding="15" id="bills-preview" class="table table-responsive table-striped customer tablesorter" cellspacing="0" style="width: 100%;">';
    inlineQty += '<thead style="color: white;background-color: #607799;">';
    inlineQty += '<tr class="text-center">';
    inlineQty += '</tr>';
    inlineQty += '</thead>';

    inlineQty += '<tbody id="result_bills"></tbody>';

    inlineQty += '</table>';
    return inlineQty;
}