# node-web-starter

This is a boilerplate project for MVC architecture using node, express and MySQL (or MariaDB)

- Ready-to-use - This project has enough functions to be used for out-of-the-box real world web services
- MVC architecture - Model, View, Controller architecture is designed for general usage
- Autoloading - Controllers, services and SQL are loaded automatically if you register them
- SQL management - SQL statements are separated from controllers or services. So they can be managed easily
- ES6 and Promise support - ES6 is used and Promise objects are created automatically if you define services
- Spring like annotation support - Controllers can be scanned and loaded automatically with annotation
- Database Failover - Relational databases such as MySQL(MariaDB), SQLite and Oracle are supported and failover features are embedded for easy configuration
- SocketIO - chat implementation using SocketIO messaging is easy because handlers are separated
- WebRTC - audio and video streaming for your multimedia needs are supported


## Application Structure

  * `config/`
    * ... - Application configuration.
  * `controllers/`
    * ... - Put controllers here.
  * `services/`
    * ... - Put services here.
  * `models/`
    * ... - Put  models here.    
  * `views/`
    * ... - Put views here (ejs default)
  * `utils/`
    * ... - Put utilities here
  * `public/`
    * ... - Put public files in css and js folders
  * `socketio/`
    * ... - Put SocketIO handlers here    
     

## Getting Started

The easiest way to get started is to clone the repository:

```sh
# Get the latest snapshot
$ git clone https://github.com/mike-jung/node-web-starter.git myproject
$ cd myproject

# Install dependencies
$ npm install
 
```

MySQL database and Redis need to be installed first.
After installing database and Redis, you can modify config/config.js file for configuration.

  * Load the sample database schema and sample records file(SQL file for MySQL) in database folder using GUI manager tool such as HeidiSQL (sample_database_person.sql)
  * Change the config/config.js file to set server port and database connection
    Here is an example :
    
```js
// config.js

module.exports = {
    server: {
        port: 7001,
	https: false
    },
    database: {  
        database_mysql: { 
            type: 'mysql',
            failover: 'true',
            retryStrategy: {
                interval: 2000,
                limit: 3,
                failoverLimit: 3
            },
            master: {
                host:'localhost',
                port:3306,
                user:'root',
                password:'admin',
                database:'test',
                connectionLimit:10,
                debug:false
            },
            slave: {
                host:'localhost',
                port:3306,
                user:'root',
                password:'admin',
                database:'test',
                connectionLimit:10,
                debug:false
            }
        }
    }
}

```

As a simplest configuration file, master and slave has the sample connection information.
Currently, MySQL(MariaDB), SQLite and Oracle database are supported
(oracle module is necessary to be installed and configured if you want to use Oracle)

After finished installation and configuration of database and Redis, you can start the server.

```sh

# Start the server
$ npm start

```

Now you can test if the server started correctly or not.
Example URL for simple response is as follows:

  * http://localhost:7001/tiger/hello
  * http://localhost:7001/dog/list
  * http://localhost:7001/cat/list

Example URL for simple fetch from database is as follows:

  * http://localhost:7001/person
  * http://localhost:7001/profile/get
  * http://localhost:7001/set_cookie


## Errors in installing modules on Windows OS

In case your OS is windows, Python and Visual Studio development environment are needed. 
If you don't have both Python and Visual Studio, type the following command before installing modules.
Windows-build-tools module will install both Python and Visual Studio modules automatically.

```sh

# Install windows-build-tools before installing other modules
$ npm install -g windows-build-tools

# Install dependencies
$ npm install

```

In case you already installed Python and Visual Studio 2012 or later, apply msvs_version option using the following command.

```sh

# Set msvs_version option according to the installed Visual Studio version
$ npm config set msvs_version 2013 --g

# Install dependencies
$ npm install

```

In case you already installed Python and Visual Studio 2010, there will be no problem in executing npm install command.


## Auto-loading

There is a fair amount of auto-loading built into this application structure.

  * Registered controllers in config/controller-config.js file will be autoloaded.
  * Controllers with annotation will be autoloaded without any configuration. 
  * Registered services in config/service-config.js file will be autoloaded.
      if you defined list method in a service, doList method will be automatically added as a Promise object
  * Registered SQL statements in config/sql-config.js file will be autoloaded.
  
  
## ES2015

This boilerplate uses ES6 syntax with Node.js >= 10.0, you can check out the [feature available here](https://nodejs.org/en/docs/es6/)


## Configuration

A configuration is designed to register controllers, services, SQL and so on. so it will show components registered. You should add a line after created a new controller. This configuration allows you to quickly find components.

The structure of a controller-configuration is simple. Here is an example :

```js
// controller-config.js

module.exports = [
    {id:1, type:'rest', base:'', unit:'person'},
    {id:2, type:'path', path:'/profile/get', method:['get','post'], file:'profile-controller', func:'get'},
    ...
```

If the type attribute is set to 'rest', methods for REST are registered automatically. (list, read, create, update, delete) The unit attribute is used to find the controller file. For example, if you created person-controller.js file in controllers folder it is designated by 'person'. You should set the file name using the unit attribute registered. The request path for the methods are determined by the standards for REST.

If the type attribute is set to 'path', the method is loaded using path, method, file and func attributes.

  * path - request path
  * method - request method ('GET', 'POST', 'PUT', etc. Multiple methods can be used)
  * file - controller file created
  * func - function in the controller file used for callback method


## Controller

Controller handles client's request.

If you create a controller, it needs to be registered in the config/controller-config.js file. In case you define a controller according to the REST standards, only unit name is needed to register in the configuration file. Unit name is used to find the controller file you created.

- See `controllers/person-controller.js` for REST type controller
- See `controllers/profile-controller.js` for API type controller
- See `controllers/test-controller.js` for cookie and session test


## Controller with annotation

Controller can be configured without any configuration if you use annotation.
Annotation is supported like Spring web framework but it is inside comment for class and methods.

- Warning : this project uses babel for ES6 support and it means all source files are transpiled and moved into dist folder. However, annotation can only be used for ES6 classes and methods. Therefore, you should maintain ES6 source files in deploying to clould server.
- See `controllers/tiger-controller.js` for @RequestMapping annotation

```js
// tiger-controller.js
...

class Tiger {

    /**
     * @RequestMapping(path="/tiger/hello")
     */
    hello(req, res) {
        logger.debug('Tiger:hello called for path /tiger/hello');

        const params = param.parse(req);
        
        const output = {
            message: 'hello'
        }
        
        util.sendRes(res, 200, 'OK', output);
    }

}

module.exports = Tiger;
```

If you restart your server, this controller's hello method is scanned and loaded automatically.
Request path is /tiger/hello and you can send a request using the following URL:

  * http://localhost:7001/tiger/hello

@RequestMapping annotation can have the following attributes.

  * path : Request path
  * method : Request method such as get, post
             Default value is 'get,post' and it means GET and POST methods are set.
	    
@Controller annotation can be set for class level configuration for setting base URI
Examples for @Controller annotation are as follows:

  * controllers/dog-controller.js    annotation for class can be set for base URI of request path
  
```js
// dog-controller.js
...

/**
 * @Controller(path="/dog")
 */
class Dog {

    /**
     * @RequestMapping(path="/list")
     */
    list(req, res) {
        logger.debug('Dog:list called for path /dog/list');

...

```
  
  
  * controllers/cat-controller.js    annotation for class can be set for REST api support
                                     list, create, read, update, delete methods are automatically configured

```js
// cat-controller.js
...

/**
 * @Controller(path="/cat", type="rest")
 */
class Cat {
 
...

```
  
    
  * controllers/bear-controller.js    annotation for class can be set for REST api support
                                      with automatic database access

```js
// bear-controller.js
...

/**
 * @Controller(path="/bear", type="rest" table="test.person")
 */
class Bear {
 
}

...

```
 
You can test REST API requests using POSTMAN or other test tools.

- (1) List : GET http://localhost:7001/bear
- (2) Create : POST http://localhost:7001/bear
             Parameters -> name=john, age=20, mobile=010-1000-1000
- (3) Read : GET http://localhost:7001/bear/1
- (4) Update : PUT http://localhost:7001/bear/1
             Parameters -> name=john, age=20, mobile=010-1000-1000
- (5) Delete : DELETE http://localhost:7001/bear/1

Pagination, order by and search functions are supported.
Column names can be sent as request parameters for retrieving only designated columns.

- (1) GET http://localhost:7001/bear?page=1&perPage=10
- (2) GET http://localhost:7001/bear?page=1&perPage=10&search=name&searchValue=john&order=name&orderDirection=asc
- (3) GET http://localhost:7001/bear?columns=id,name


## Service

Service is used to handle dedicated work for controllers.

Methods created for a service are especially supported to be called using Promise object. In other words, Promise objects for REST methods are added automatically. 

If you define `list` method in a service, `doList` method will be automatically added as a Promise object.
(`do` is prepended after the first character of the method is capitalized)

- See `services/person-service.js`


## Model

Model is a representation of database object or schematic model. It means that the parameters sent from client can be used to make a model.

- See `models/person.js`


## SQL Execution

SQL file is separated in the database/sql/person_sql.js file. 

Here is an example :

```js
// person_sql.js

module.exports = {
    person_login: {
        sql: "select \
                id \
            from test.users \
            where id = ? and password = ?",
        params: [
            'id',
            'password'
        ]
    },
    ...
```

The name of SQL attribute is used to determine which SQL statement needs to be executed by controllers or services.
Request parameters from client can be used here and params array let us know which parameter is used for the SQL statement. 

This sql statement can be executed as follows:

```js
// profile-controller.js

async add(req, res) {
  const params = param.parse(req);
	
  try {
    const sqlName = 'person_add';
    const rows = await database.execute(sqlName, params);

    util.sendRes(res, 200, 'OK', rows);
  } catch(err) {
    util.sendError(res, 400, 'Error in execute -> ' + err);
  }

}

```

util/param.js utility parses request parameters regardless of GET or POST request methods. Even URL parameters can be parsed.


## SocketIO and Redis

SocketIO messaging is enabled if you change config/config.js file.

```js
// config.js
...

    socketio: {
        active: true
    }
    
}

...

```

You can create handler files for SocketIO and put them into socketio folder.

Redis is used for SocketIO and failover for Redis is basically supported.
Redis sentinels can be configured as follows.
    (Redis is used only for SocketIO messaging if you do not use it for other purposes)
    If you have no idea on Redis sentinels, see [guides here](https://redis.io/topics/sentinel) 
  
```js
// config.js
...

redis: {
        sentinels: [
            { host:'127.0.0.1', port: 11425 },
            { host:'127.0.0.1', port: 11426 },
            { host:'127.0.0.1', port: 11427 }
        ],
        name: 'mymaster'
    },

...
```


## API documentation

API documentation using swagger is applied. You can access documentation for controllers as the following:

- See http://localhost:7001/api-docs


## License
MIT © Mike Jung

## Layout Mapping
** 주의사항
information 사진 이용시 source 값 data.information
이름주의의 겉 div itemNo 값 nameWarning
이름주의의 속 text itemNp 값 nameWarningText1 과 nameWarningText2 
{
  "firstName": {
    "target": "text",
    "title": "환자명",
    "source": "data.firstName"
  },
  "nameWarning": {
    "target": "text",
    "title": "이름주의 (Y/N)",
    "source": "data.nameWarning"
  },
  "itemNo": {
    "target": "text",
    "title": "환자번호",
    "source": "data.id"
  },
  "itemNo": {
    "target": "text",
    "title": "성별/나이",
    "source": "data.genderAge"
  },
  "department": {
    "target": "text",
    "title": "진료과",
    "source": "data.dept"
  },
  "doctorName1": {
    "target": "text",
    "title": "지정의",
    "source": "data.doctorName1"
  },
  "doctorName2": {
    "target": "text",
    "title": "주치의",
    "source": "data.doctorName2"
  },
  "itemNo": {
    "target": "text",
    "title": "입원일자",
    "source": "data.treatDate"
  },
  "itemNo": {
    "target": "text",
    "title": "퇴원예정",
    "source": "data.leavingDate"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(월)오전",
    "source": "data.monRoundingTime1"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(월)오후",
    "source": "data.monRoundingTime2"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(화)오전",
    "source": "data.tueRoundingTime1"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(화)오후",
    "source": "data.tueRoundingTime2"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(화)오전",
    "source": "data.wedRoundingTime1"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(수)오후",
    "source": "data.wedRoundingTime2"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(목)오전",
    "source": "data.thuRoundingTime1"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(목)오후",
    "source": "data.thuRoundingTime2"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(금)오전",
    "source": "data.friRoundingTime1"
  },
  "itemNo": {
    "target": "text",
    "title": "회진시간(금)오후",
    "source": "data.friRoundingTime2"
  },
  "itemNo": {
    "target": "text",
    "title": "주의사항1",
    "source": "data.cautionMemo1"
  },
  "itemNo": {
    "target": "text",
    "title": "주의사항2",
    "source": "data.cautionMemo2"
  },
  "itemNo": {
    "target": "data-code",
    "title": "QR코드",
    "source": "data.qr1"
  },
  "itemNo": {
    "target": "src",
    "title": "이미지 1",
    "source": "data.cautions",
    "operator": {
      "name": "switch",
      "condition1": "array",
      "condition2": "0"
    }
  },
  "itemNo": {
    "target": "src",
    "title": "이미지2 ",
    "source": "data.cautions",
    "operator": {
      "name": "switch",
      "condition1": "array",
      "condition2": "1"
    }
  },
  "itemNo": {
    "target": "src",
    "title": "이미지 3",
    "source": "data.cautions",
    "operator": {
      "name": "switch",
      "condition1": "array",
      "condition2": "2"
    }
  },
  "itemNo": {
    "target": "src",
    "title": "이미지 4",
    "source": "data.cautions",
    "operator": {
      "name": "switch",
      "condition1": "array",
      "condition2": "3"
    }
  },
  "itemNo": {
    "target": "src",
    "title": "이미지 5",
    "source": "data.cautions",
    "operator": {
      "name": "switch",
      "condition1": "array",
      "condition2": "4"
    }
  },
  "itemNo": {
    "target": "src",
    "title": "이미지 6",
    "source": "data.cautions",
    "operator": {
      "name": "switch",
      "condition1": "array",
      "condition2": "5"
    }
  },
  "itemNo": {
    "target": "src",
    "title": "Information",
    "source": "data.information",
    "operator": {
      "name": "switch",
      "condition1": "array",
      "condition2": "0"
    }
  }
}
