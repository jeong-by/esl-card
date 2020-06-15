/**
 * This controller registers REST API functions automatically using @Controller annotation on Bear.
 *
 * Example request urls are as follows:
 * 
 * (1) http://localhost:7001/baroboard/device/group/list
 * (2) http://localhost:7001/baroboard/device/group/create
 * (3) http://localhost:7001/baroboard/device/group/read/1
 * (4) http://localhost:7001/baroboard/device/group/update/1
 * (5) http://localhost:7001/baroboard/device/group/delete/1
 * 
 */

/**
 * @Controller(path="/baroboard/device_group", type="rest", table="baroboard.device_group")
 */
class BaroboardDeviceGroup {

}

module.exports = BaroboardDeviceGroup;
