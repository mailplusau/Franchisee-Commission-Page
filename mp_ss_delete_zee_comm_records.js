/**
* Module Description
* 
* NSVersion    Date                Author         
* 1.00         2020-08-19 14:03:00 Raphael
*
* Description: Delete all the instances of 'customrecord_zee_commission_page' and 
* 'customrecord_zee_comm_inv_datatable' records. These records use a timestamp and 
* are meant to be loaded only once. Therefore, they don't need to be saved.
* 
* @Last Modified by:   raphaelchalicarnemailplus
* @Last Modified time: 2020-08-19 14:03:00
*
*/

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}
var ctx = nlapiGetContext();

function deleteRecords() {
    // Delete all instances of 'customrecord_zee_commission_page'
    var zcpSearch = nlapiLoadSearch('customrecord_zee_commission_page', 'customsearch_zee_commission_page_3');
    var zcpSearchResultSet = zcpSearch.runSearch();
    var index = 0;
    zcpSearchResultSet.forEachResult(function (zcpResult) {
        deleteResultRecord(zcpResult, index);
        index += 1;
        return true;
    });

    // Delete all instances of 'customrecord_zee_comm_inv_datatable'
    var zcidSearch = nlapiLoadSearch('customrecord_zee_comm_inv_datatable', 'customsearch_zee_comm_inv_datatable');
    var zcidSearchResultSet = zcidSearch.runSearch();
    index = 0;
    zcidSearchResultSet.forEachResult(function (zcidResult) {
        deleteResultRecord(zcidResult, index);
        index += 1;
        return true;
    });
}

/**
 * This function deletes the record of the result `searchResult`.
 * @param {nlobjSearchResult}   searchResult
 * @param {Number}              index
 */
function deleteResultRecord(searchResult, index) {
    var usage_loopstart_cust = ctx.getRemainingUsage();
    if (usage_loopstart_cust < 4 || index == 3999) {
        // Rescheduling a scheduled script doesn't consumes any governance units.
        nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId());
    }
    // Deleting a record consumes 4 governance units.
    nlapiDeleteRecord(searchResult.getRecordType(), searchResult.getId());
}