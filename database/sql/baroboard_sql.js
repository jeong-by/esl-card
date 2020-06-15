module.exports = {
    baroboard_layout_mapping_update: {
        sql: "update baroboard.layout \
              set mapping = :mapping, \
                  modify_date = now() \
              where id = :id"
    },
    baroboard_device_data_update: {
        sql: "update baroboard.device \
              set data = :data \
              where id = :id"
    },
    baroboard_device_data_update_sync: {
        sql: "update baroboard.device \
              set data = :data, \
                  data_date = now() \
              where id = :id"
    },
    // BY START 2019-12-12 //코드값, rotation값 추가로 갖고옴
    baroboard_device_data_select : {
        sql: "select a.id, a.name,a.code, a.group_name, a.type,a.rotation, a.size, a.resolution, a.layout_id, a.layout_name, a.data as device_data \
                     , b.data as layout_data, b.mapping as layout_mapping \
              from baroboard.device a, baroboard.layout b \
              where a.id = :id \
                and a.layout_id = b.id"
    },
    // BY END 2019-12-12
    baroboard_dashboard_list: {
        sql: "select group_id, group_name, \
                    count(id) as count_total, \
                    count(if(status = '200', status, null)) as count_normal, \
                    count(if(status <> '200', status, null)) as count_alert, \
                    round(( count(if(status = '200', status, null)) / count(id) * 100 ), 0) as health_percentage \
              from baroboard.device \
              group by group_id"
    },
    baroboard_dashboard_sublist: {    // 대시보드에서 한 부서 선택 시 해당 부서의 단말리스트 조회
        sql: "select id, name, group_id, group_name, \
                    type, size, resolution, location, \
                    status, status_message, battery, \
                    data_date, layout_id, layout_name, \
                    data, date_format(data_date, '%Y-%m-%d %H:%i:%s') as data_date \
              from baroboard.device \
              where group_id = :groupId"
    },
    baroboard_dashboard_fieldlist: {  // 현장운영자의 대시보드를 위해 지정한 부서의 단말리스트 조회
        sql: "select id, name, group_id, group_name, \
                    type, size, resolution, location, \
                    status, status_message, battery, \
                    data_date, layout_id, layout_name, \
                    data, date_format(data_date, '%Y-%m-%d %H:%i:%s') as data_date \
              from baroboard.device \
              where group_name = :groupName"
    },
    baroboard_users_login: {  // 로그인
        sql: "select id, name, details, level, dept \
              from baroboard.users \
              where id = :userId \
                    and password = :userPassword"
    },
    baroboard_users_login_date: {  // 로그인 시간 업데이트
        sql: "update baroboard.users \
              set login_date = now() \
              where id = :userId"
    },
    baroboard_users_logout_date: {  // 로그아웃 시간 업데이트
        sql: "update baroboard.users \
              set logout_date = now() \
              where id = :userId"
    },
    // BY START 2019-11-25
    baroboard_legacy: { //레거시 정보 갖고오기
        sql: "select ip \
              from baroboard.legacy" 
    },
    // BY END 2019-11-25

    // BY START 2019-12-11
    baroboard_preview_data: {
        sql: "select resolution, data as layout_data, mapping as layout_mapping from baroboard.layout where id = :id"
    },

    // BY END 2019-12-11
    baroboard_dashboard_deletepreview: {
        sql: "delete from baroboard.layout where id = 'preview'"
    },

    // BY START 2019-12-16
    baroboard_badbattery_update: {
        sql: "update baroboard.device set battery = 'BAD' where code = :labelcode "
    },

    baroboard_goodbattery_update: {
        sql: "update baroboard.device set battery = 'GOOD' where code = :labelcode "
    },

    baroboard_device_status_update: {
        sql: "update baroboard.device set status = :status, status_message = :status_message where id = :id "
    },
    // BY END 2019-12-16

    // BY START 2020-01-06
    baroboard_device_layout_mapper : {
        sql: "select d.id as id, d.name as name , d.layout_id as layout_id ,d.layout_name as layout_name,d.data as data,l.mapping as mapping from baroboard.device d , baroboard.layout l where d.layout_name = l.name and d.name = :wardInfo"
    },
    baroboard_image_list : {
        sql:"select name from baroboard.image"
    },
    baroboard_image_category_list : {
        sql:"select name ,image from baroboard.image_category "
    },
    baroboard_image_category_item_delete : {
        sql:"update baroboard.image_category set image = :image where name = :name "
    },
    baroboard_device_update_esldate : {
        sql:"update baroboard.device set esl_date = :date where code = :labelcode"
    },
    baroboard_device_update_esldate2 : {
        sql:"update baroboard.device set esl_date = now() where code = :labelcode"
    },
    baroboard_image_category_item_update : {
        sql:"update baroboard.image_category set image = :image where name = :name"
    },
    baroboard_image_category_add : {
        sql:"INSERT INTO baroboard.image_category (name) VALUES (:name)"
    },
    baroboard_image_category_delete : {
        sql:"DELETE FROM baroboard.image_category WHERE name = :name"
    },
    baroboard_image_delete : {
        sql:"DELETE FROM baroboard.image WHERE name = :name"
    },
    baroboard_device_modify_layout : {
        sql:"UPDATE baroboard.device SET layout_id = :id, layout_name = :newname WHERE layout_name = :name "
    },
    baroboard_device_check_usinglayout : {
        sql:"SELECT count(*) as count FROM baroboard.device WHERE layout_id = :id "
    },
    baroboard_device_data_resetData : {
        sql:"UPDATE baroboard.device SET data = :data WHERE group_id = :wardId"
    },
    baroboard_device_data_getDevice : {
        sql:"SELECT d.id as id, d.name as `name`, l.mapping as mapping FROM baroboard.device d , baroboard.layout l WHERE d.group_id = :wardId AND l.id = d.layout_id "
    },
    baroboard_image_add : {
        sql:"INSERT INTO baroboard.image (name) VALUES (:name)"
    }

}