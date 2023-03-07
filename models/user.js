'use strict';

module.exports = (sequelize,DataTypes) => {
    var user = sequelize.define('user', {
        id : {
            type: DataTypes.STRING,
            allowNull: false
        },
        name : {
            type: DataTypes.STRING,
            allowNull: false
        },
        password : {
            type: DataTypes.STRING,
            allowNull: false
        },
        salt : {
            type:DataTypes.STRING
        }
    })
    return user
}