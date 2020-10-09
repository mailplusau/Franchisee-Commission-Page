/**
 * Module Description
 * 
 * NSVersion    Date                Author         
 * 1.00         2020-07-20 09:39:00 Raphael
 *
 * Description: Ability for the franchisee to see the commission the details of the commissions they earned for each invoice.
 * 
 * @Last Modified by:   Anesu
 * @Last Modified time: 2020-07-21 14:11:33
 *
 */

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var ctx = nlapiGetContext();
var userRole = parseInt(ctx.getRole());
var zee_id = '';
if (userRole == 1000) {
    zee_id = ctx.getUser();
}
// load_record_interval is a global var so that the function clearInterval() can be called anywhere in the code.
var load_record_interval;

function pageInit() {
    if (userRole != 1000) {
        var param_zee_id = nlapiGetFieldValue('custpage_zee_id');
        if (!isNullorEmpty(param_zee_id)) {
            zee_id = parseInt(param_zee_id);
        }
    }
    var date_from = nlapiGetFieldValue('custpage_date_from');
    var date_to = nlapiGetFieldValue('custpage_date_to');
    var type = nlapiGetFieldValue('custpage_type');
    var paid = nlapiGetFieldValue('custpage_paid');
    var timestamp = nlapiGetFieldValue('custpage_timestamp');

    if (!isNullorEmpty(date_from)) {
        date_from_input = dateNetsuiteToISO(date_from);
        $('#date_from').val(date_from_input);
    }
    if (!isNullorEmpty(date_to)) {
        date_to_input = dateNetsuiteToISO(date_to);
        $('#date_to').val(date_to_input);
    }

    load_record_interval = setInterval(loadZCIDRecord, 15000, zee_id, date_from, date_to, type, paid, timestamp);
}

var billsDataSet = [];
var creditDataSet = [];
$(document).ready(function() {
    $('#bills-preview').DataTable({
        data: billsDataSet,
        pageLength: 100,
        columns: [
            { title: "Invoice Number / Credit Memo" },
            {
                title: "Invoice / Credit Memo Date",
                type: "date"
            },
            {
                title: "Invoice / Credit Memo Payment Date",
                type: "date"
            },
            { title: "Customer Name" },
            {
                title: "Total Revenue [incl. GST]",
                type: "num-fmt"
            },
            {
                title: "Total Commission [incl. GST]",
                type: "num-fmt"
            },
            { title: "Type" },
            { title: "Bill Number" },
            { title: "Bill Payment" },
            {
                title: "Bill / Bill Credit Payment Date",
                type: "date"
            },
            { title: "Invoice / Credit Memo Status" },
            {} //title: "paid_amount == total_commission" 
        ],
        columnDefs: [{
                targets: 3,
                className: 'dt-body-left'
            },
            {
                targets: 5,
                createdCell: function(td, cellData, rowData, row, col) {
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
            },
            {
                targets: [0, 4, 5],
                className: 'bolded'
            }
        ],
        rowCallback: function(row, data) {
            $('td:eq(1)', row).html
            if (data[10] == 'Open') {
                if ($(row).hasClass('odd')) {
                    $(row).css('background-color', 'LemonChiffon');
                } else {
                    $(row).css('background-color', 'LightYellow');
                }
            }
            if (data[10] == 'Fully Applied') {
                if ($(row).hasClass('odd')) {
                    $(row).css('background-color', 'rgb(205, 92, 92, 0.5)');
                } else {
                    $(row).css('background-color', 'rgb(205, 92, 92, 0.4)');
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

/**
 * "ZCID record" stands for "Zee Commission Invoice Datatable". ('customrecord_zee_comm_inv_datatable')
 * This record contains the results of the search, and is calculated with the scheduled script 'mp_ss_zee_comm_inv_datatable'.
 * @param {Number} zee_id 
 * @param {String} date_from 
 * @param {String} date_to
 * @param {String} type 
 * @param {String} paid
 * @param {Number} timestamp
 */
function loadZCIDRecord(zee_id, date_from, date_to, type, paid, timestamp) {
    var zcidFilterExpression = [];
    // Date from
    if (!isNullorEmpty(date_from)) {
        zcidFilterExpression[0] = new nlobjSearchFilter('custrecord_zcid_date_from', null, 'on', date_from);
    } else {
        zcidFilterExpression[0] = new nlobjSearchFilter('custrecord_zcid_date_from', null, 'isempty', '');
    }
    // Date to
    if (!isNullorEmpty(date_to)) {
        zcidFilterExpression[1] = new nlobjSearchFilter('custrecord_zcid_date_to', null, 'on', date_to);
    } else {
        zcidFilterExpression[1] = new nlobjSearchFilter('custrecord_zcid_date_to', null, 'isempty', '');
    }
    // Zee ID
    zcidFilterExpression[2] = new nlobjSearchFilter('custrecord_zcid_zee_id', null, 'is', zee_id);
    // Type
    if (!isNullorEmpty(type)) {
        zcidFilterExpression[3] = new nlobjSearchFilter('custrecord_zcid_type', null, 'is', type);
    } else {
        zcidFilterExpression[3] = new nlobjSearchFilter('custrecord_zcid_date_from', null, 'isempty', '');
    }
    // Paid
    if (!isNullorEmpty(paid)) {
        zcidFilterExpression[4] = new nlobjSearchFilter('custrecord_zcid_paid', null, 'is', paid);
    } else {
        zcidFilterExpression[4] = new nlobjSearchFilter('custrecord_zcid_paid', null, 'isempty', '');
    }
    // Timestamp
    zcidFilterExpression[5] = new nlobjSearchFilter('custrecord_zcid_timestamp', null, 'is', timestamp);

    // Create search and load results
    var zcidSearch = nlapiLoadSearch('customrecord_zee_comm_inv_datatable', 'customsearch_zee_comm_inv_datatable');
    zcidSearch.setFilters(zcidFilterExpression);
    var zcidSearchResults = zcidSearch.runSearch();
    var zcidSearchResult = zcidSearchResults.getResults(0, 1);
    if (!isNullorEmpty(zcidSearchResult)) {
        var zcidRecord = zcidSearchResult[0];
        var invoices_rows = JSON.parse(zcidRecord.getValue('custrecord_zcid_invoices_rows'));
        var credit_rows = JSON.parse(zcidRecord.getValue('custrecord_zcid_credit_rows'));

        console.log(invoices_rows);
        // console.log(credit_rows);

        var bills_id_set = JSON.parse(zcidRecord.getValue('custrecord_zcid_bills_id_set'));
        var customer_name_dict = JSON.parse(zcidRecord.getValue('custrecord_zcid_customer_name_dict'));
        loadDatatable(invoices_rows, credit_rows, bills_id_set, customer_name_dict);
    }
}

/**
 * 
 * @param {Array}   invoices_rows 
 * @param {Array}   bills_id_set 
 * @param {Object}  customer_name_dict 
 */
function loadDatatable(invoices_rows, credit_rows, bills_id_set, customer_name_dict) {
    $('#result_bills').empty();
    var billsDataSet = [];
    var creditDataSet = [];

    if (!isNullorEmpty(invoices_rows)) {
        invoices_rows.forEach(function(invoice_row, index_ir) {
            var invoice_number = 'Invoice #INV' + invoice_row.in;
            var invoice_id = invoice_row.inid;
            var invoice_link = '<a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + invoice_id + '">' + invoice_number + '</a>'
                // var invoice_date = dateNetsuiteToISO(invoice_row.id);
            var invoice_date = invoice_row.id;
            var customer_id = invoice_row.ci;
            var customer_name = customer_name_dict[customer_id];
            var total_revenue = invoice_row.tr;
            var total_commission = invoice_row.tc;
            var invoice_type = '';
            switch (invoice_row.it) {
                case 'S':
                    invoice_type = 'Services';
                    invoice_number = invoice_link;
                    break;
                case 'P':
                    invoice_type = 'Products';
                    if (userRole != 1000) {
                        invoice_number = invoice_link;
                    }
                    break;
                default:
                    break;
            }
            var bill_id = invoice_row.bi;
            var bill_number = 'Bill #' + bill_id;
            if (userRole != 1000) {
                bill_number = '<a href="' + baseURL + '/app/accounting/transactions/vendbill.nl?id=' + bill_id + '">' + bill_number + '</a>';
            }

            /**
             *  Credit Memo Information in Datatable.
             */
            // var credit_memo_id = invoice_row.cmid; // Invoice Info from parameters that contains credit memo. 
            // var credit_memo_name = (!isNullorEmpty(credit_memo_id)) ? 'Credit Memo #' + invoice_row.cmn : '';

            // if (userRole != 1000) {
            //     credit_memo_name = '<a href="' + baseURL + '/app/accounting/transactions/custcred.nl?id=' + credit_memo_id + '">' + credit_memo_name + '</a>';
            // }
            // var credit_memo_amount = invoice_row.cma // Credit Memo Amount
            // var bill_credit_memo = invoice_row.bcm;

            // For the positive commission, check that the paid amount equals the commission amount.
            // If not, the cell background will be colored in red.
            var bill_payment_id = invoice_row.bpi;
            var bill_payment = (!isNullorEmpty(bill_payment_id)) ? 'Bill #' + bill_payment_id : '';
            var bill_payment_date = invoice_row.bpd;
            var paid_amount_is_total_commission = invoice_row.paitc;

            var invoice_status = '';
            switch (invoice_row.is) {
                case 'O':
                    invoice_status = 'Open';
                    break;
                case 'P':
                    invoice_status = 'Paid In Full';
                    break;
                case 'V':
                    invoice_status = 'Voided';
                    break;
                default:
                    break;
            }
            // var invoice_date_paid = dateNetsuiteToISO(invoice_row.idp);
            var invoice_date_paid = invoice_row.idp;

            total_revenue = financial(total_revenue);
            total_commission = financial(total_commission);

            // billsDataSet.push([invoice_number, invoice_date, customer_name, total_revenue, total_commission, invoice_type, bill_number, bill_payment, bill_payment_date, invoice_date_paid, invoice_status, paid_amount_is_total_commission]);
            billsDataSet.push([invoice_number, invoice_date, invoice_date_paid, customer_name, total_revenue, total_commission, invoice_type, bill_number, bill_payment, bill_payment_date, invoice_status, paid_amount_is_total_commission]);

            // __________________________________________________________________________________________________________________
            var credit_memo_id = invoice_row.cmid; // Invoice Info from parameters that contains credit memo. 
            var credit_memo_name = (!isNullorEmpty(credit_memo_id)) ? 'Credit Memo #' + invoice_row.cmn : '';
            if (userRole != 1000) {
                credit_memo_name = '<a href="' + baseURL + '/app/accounting/transactions/custcred.nl?id=' + credit_memo_id + '">' + credit_memo_name + '</a>';
            }
            // var credit_memo_date = dateNetsuiteToISO(invoice_row.cmd);
            var credit_memo_date = invoice_row.cmd;
            var credit_memo_customer_name = invoice_row.cmcm;
            // var customer_name = customer_name_dict[credit_memo_customer_id];
            var credit_memo_amount = invoice_row.cma // Credit Memo Amount
            var bill_credit_amount = invoice_row.bca; // Bill Credit Amount
            var credit_memo_type = '';
            switch (invoice_row.cmt) {
                case 'S':
                    credit_memo_type = 'Services';
                    break;
                case 'P':
                    credit_memo_type = 'Products';
                    break;
                default:
                    break;
            }
            var bill_credit_id = invoice_row.bcid;
            var bill_credit_number = (!isNullorEmpty(bill_credit_id)) ? 'Bill Credit #' + bill_credit_id : '';
            if (userRole != 1000) {
                bill_credit_number = '<a href="' + baseURL + '/app/accounting/transactions/vendcred.nl?id=' + bill_credit_id + '">' + bill_credit_number + '</a>';
            }

            var bill_credit_payment_id = invoice_row.bcpid;
            var bill_credit_payment = (!isNullorEmpty(bill_credit_payment_id)) ? 'Bill Credit #' + bill_credit_payment_id : '';
            var bill_credit_payment_date = invoice_row.bcpd;
            var credit_memo_payment_date = invoice_row.cmpd;

            var credit_memo_status = '';
            switch (invoice_row.cms) {
                case 'O':
                    credit_memo_status = 'Open';
                    break;
                case 'F':
                    credit_memo_status = 'Fully Applied';
                    break;
                case 'V':
                    credit_memo_status = 'Voided';
                    break;
                default:
                    break;
            }
            var credit_memo_payment_date = invoice_row.cmpd;

            credit_memo_amount = financialNegative(credit_memo_amount);
            bill_credit_amount = financialNegative(bill_credit_amount);


            if (!isNullorEmpty(credit_memo_id)) {
                creditDataSet.push([credit_memo_name, credit_memo_date, credit_memo_payment_date, credit_memo_customer_name, credit_memo_amount, bill_credit_amount, credit_memo_type, bill_credit_number, bill_credit_payment, bill_credit_payment_date, credit_memo_status, paid_amount_is_total_commission]);
            }
        });
    }

    // if (!isNullorEmpty(credit_rows)){
    //     credit_rows.forEach(function (credit_row){
    //         /**
    //          *  Credit Memo Information in Datatable.
    //          */
    //         var credit_memo_id = credit_row.cmid; // Invoice Info from parameters that contains credit memo. 
    //         var credit_memo_name = (!isNullorEmpty(credit_memo_id)) ? 'Credit Memo #' + credit_row.cmn : '';
    //         if (userRole != 1000) {
    //             credit_memo_name = '<a href="' + baseURL + '/app/accounting/transactions/custcred.nl?id=' + credit_memo_id + '">' + credit_memo_name + '</a>';
    //         }
    //         var credit_memo_date = dateNetsuiteToISO(credit_row.cmd);

    //         var credit_memo_customer_id = credit_row.cmi;
    //         // var customer_name = customer_name_dict[credit_memo_customer_id];
    //         var customer_name = 'ye';
    //         var credit_memo_amount = credit_row.cma // Credit Memo Amount
    //         var bill_credit_amount = credit_row.bca; // Bill Credit Amount

    //         var credit_memo_type = '';
    //         switch (credit_row.cmt) {
    //             case 'S':
    //                 credit_memo_type = 'Services';
    //                 // invoice_number = invoice_link;
    //                 break;
    //             case 'P':
    //                 credit_memo_type = 'Products';
    //                 if (userRole != 1000) {
    //                     // invoice_number = invoice_link;
    //                 }
    //                 break;
    //             default:
    //                 break;
    //         }
    //         var bill_credit_id = credit_row.bcid;
    //         var bill_credit_number = 'Bill Credit #' + bill_id;
    //         if (userRole != 1000) {
    //             bill_credit_number = '<a href="' + baseURL + '/app/accounting/transactions/vendcred.nl?id=' + bill_credit_id + '">' + bill_credit_number + '</a>';
    //         }

    //         var bill_credit_payment_id = credit_row.bcpid;
    //         var bill_credit_payment = (!isNullorEmpty(bill_credit_payment_id)) ? 'Bill Credit #' + bill_credit_payment_id : '';
    //         var bill_credit_payment_date = credit_row.bcpd;
    //         var credit_memo_payment_date = credit_row.cmpd;

    //         var credit_memo_status = '';
    //         switch (credit_row.cms) {
    //             case 'O':
    //                 invoice_status = 'Open';
    //                 break;
    //             case 'F':
    //                 invoice_status = 'Fully Applied';
    //                 break;
    //             case 'V':
    //                 invoice_status = 'Voided';
    //                 break;
    //             default:
    //                 break;
    //         }
    //         var credit_memo_payment_date = dateNetsuiteToISO(credit_row.cmpd);
    //         credit_memo_amount = financialNegative(credit_memo_amount);
    //         bill_credit_amount = financialNegative(bill_credit_amount);

    //         if (credit_memo_id != ''){
    //     creditDataSet.push([credit_memo_name, credit_memo_date, credit_memo_customer_name, credit_memo_amount, bill_credit_amount, credit_memo_type, bill_credit_number, bill_credit_payment, bill_credit_payment_date, credit_memo_payment_date, credit_memo_status]);
    // }
    //     });
    // }

    //Update Total Amounts
    totalComm(billsDataSet);
    totalRev(billsDataSet);
    totalRevCred(billsDataSet, creditDataSet);
    totalCommBill(billsDataSet, creditDataSet);


    // Update datatable rows.
    var datatable = $('#bills-preview').dataTable().api();
    datatable.clear();
    datatable.rows.add(creditDataSet);
    datatable.rows.add(billsDataSet);
    datatable.draw();

    $('.loading_section').addClass('hide');
    clearInterval(load_record_interval);
    saveCsv(billsDataSet, creditDataSet);

    return true;
}

function totalComm(billsDataSet){
    var total = 0;
    billsDataSet.forEach(function (row){
        row = financialToNumber(row[5]);
        row = parseFloat(row);
        if (!isNaN(row)){
            total += row;
        }        
    });
    console.log('Total Comm: ' + total);
    total = financial(total);
    $('#total_comm').val(total);
}

function totalRev(billsDataSet){
    var total = 0;
    billsDataSet.forEach(function (row){
        row = financialToNumber(row[4]);
        row = parseFloat(row);
        if (!isNaN(row)){
            total += row;
        }        
    });
    console.log('Total Rev: ' + total);
    total = financial(total);
    $('#total_rev').val(total);
}

function totalRevCred(billsDataSet, creditDataSet){
    var total = 0;
    billsDataSet.forEach(function (row){
        row = financialToNumber(row[4]);
        row = parseFloat(row);
        if (!isNaN(row)){
            total += row;
        }        
    });
    creditDataSet.forEach(function (row){
        row = financialNegToNumber(row[4]);
        row = parseFloat(row);
        if (!isNaN(row)){
            total -= row;
        }        
    });
    console.log('Total Rev with Cred: ' + total);
    total = financial(total);
    $('#total_cred').val(total);
}

function totalCommBill(billsDataSet, creditDataSet){
    var total = 0;
    billsDataSet.forEach(function (row){
        row = financialToNumber(row[5]);
        row = parseFloat(row);
        if (!isNaN(row)){
            total += row;
        }        
    });
    creditDataSet.forEach(function (row){
        row = financialNegToNumber(row[5]);
        row = parseFloat(row);
        if (!isNaN(row)){
            total -= row;
        }        
    });
    console.log('Total Comm with Bill: ' + total);
    total = financial(total);
    $('#total_bill').val(total);
}

/**
 * Create the CSV and store it in the hidden field 'custpage_table_csv' as a string.
 * @param {Array} billsDataSet The `billsDataSet` created in `loadDatatable()`.
 */
function saveCsv(billsDataSet, creditDataSet) {
    var headers = $('#bills-preview').DataTable().columns().header().toArray().map(function(x) { return x.innerText });
    headers = headers.slice(0, headers.length - 1).join(', ');
    var csv = headers + "\n";
    billsDataSet.forEach(function(row) {
        row[0] = $.parseHTML(row[0])[0].text;
        row[4] = financialToNumber(row[4]);
        row[5] = financialToNumber(row[5]);
        row[7] = $.parseHTML(row[7])[0].text;
        csv += row.join(',');
        csv += "\n";
    });
    creditDataSet.forEach(function(row) {
        row[0] = $.parseHTML(row[0])[0].text;
        row[4] = financialToNumber(row[4]);
        row[5] = financialToNumber(row[5]);
        row[7] = $.parseHTML(row[7])[0].text;
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
    if (typeof(x) == 'string') {
        x = parseFloat(x);
    }
    if (isNullorEmpty(x) || isNaN(x)) {
        return "$0.00";
    } else {
        return x.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    }
}

/**
 * @param   {Number} x
 * @returns {String} The same number, but converted to a negative value & formatted in Australian dollars.
 */
function financialNegative(x) {
    var re = /\-/g;
    x = x.replace(re, '');

    if (typeof(x) == 'string') {
        x = parseFloat(x);
    }

    if (isNaN(x)) {
        return "$0.00";
    } else {
        // Matches the minus symbol and replaces with blank string.
        return '-' + x.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
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
 * Converts a price string (as returned by the function `financial()`) to a String readable as a Number object
 * @param   {String} price $4,138.47
 * @returns {String} 4138.47
 */
function financialNegToNumber(price) {
    // Matches the '$' and ',' symbols.
    var re = /\-|\$|\,/g;
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