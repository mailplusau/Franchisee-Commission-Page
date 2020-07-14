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
    
}

function saveRecord() {
    
}