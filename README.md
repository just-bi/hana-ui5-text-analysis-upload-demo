# hana-ui5-text-analysis-upload-demo
A simple ui5 app to upload documents to SAP HANA to demo its text mining and analysis features.

![Overview of the UI5 Upload Demo App for exploring SAP HANA Text Analysis](https://drive.google.com/uc?id=1wJlPq9osrJZQQyA2Aw2St_JjBn8ReH51&authuser=0&export=download "Application Overview Screenshot")

## Background and Overview

There is a series of blog posts available that explains the background of this demo application, some of the design considerations, and some information concerning implementation details:

* Part 1 - an Overview: [SAP HANA Text Analysis on Documents uploaded by an end-user](http://rpbouman.blogspot.com/2019/12/building-ui5-demo-for-sap-hana-text.html")
* Part 2 - Hands on: [Building the backend for a SAP HANA Text Analysis application](https://rpbouman.blogspot.com/2019/12/building-ui5-demo-for-sap-hana-text_1.html)
* Part 3 - Presenting: [A UI5 front-end to upload documents and explore SAP HANA Text Analytics features](https://rpbouman.blogspot.com/2019/12/building-ui5-demo-for-sap-hana-text_2.html)
* Part 4 - Deep dive: [How to upload documents with OData in a UI5 Application](https://rpbouman.blogspot.com/2019/12/building-ui5-demo-for-sap-hana-text_3.html)

## SAP HANA 1.0 - Installation

* Create a package with your favorite IDE for SAP HANA (Web IDE, SAP HANA Studio, Eclipse with SAP HANA Developer Tools)
* [Download](https://github.com/just-bi/hana-ui5-text-analysis-upload-demo/archive/master.zip) an archive of this repository
* Unzip the archive and transfer its contents to the HANA package you just created.
* With `db/CT_FILE.hdbdd`:
  * update the `namespace`, update the package identifier from `"system-local"."public"."rbouman"."ta"` to the name of the package you just created.
  * modify the `@Schema` from `'RBOUMAN'` to whatever schema you want to use. (Create a schema yourself if you don't already have one)
  * Activate `db/CT_FILE.hdbdd`. In the database catalog, you should now have this table. Hana should have created a [corresponding `$TA_` table](https://help.sap.com/viewer/fedd7e90a382415cbdd273891651ab4d/1.0.12/en-US/e580220fc1014045ab9f45ea9f82d8d8.html) as well.
* With `service/ta.xsodata`:
  * In the first entity definition, update the table repository object identifier `"system-local.public.rbouman.ta.db::CT_FILE"` so it matches the location of the table on your system.
  * In the second entity definition, update the catalog table identifier from `"RBOUMAN"."$TA_system-local.public.rbouman.ta.db::CT_FILE.FT_IDX_CT_FILE"` so it matches the database schema and catalog table name on your system.
  * Activate `service/ta.xsodata`.
* You can now activate the package you created to activate all remaining objects, such as the `.xsapp` and `.xsaccess` files, as well as the `web` subpackage and all its contents

## Running the Application

After installation, you should be able to open the web application. You can do this by navigating to:

  http://yourhanahost:yourxsport/path/to/your/package/web/index.html
  
where:
* `yourhanahost` is the hostname or IP address of your SAP HANA system
* `yourxsport` is the [port where your HANA's xs engine is running](https://help.sap.com/viewer/6b94445c94ae495c83a19646e7c3fd56/1.0.12/en-US/116cc3f3f3f645159ee138c3ba50a48b.html). Typically this is 80 followed by your HANA instance number.
* `path/to/your/package` is the name of the package where you installed the app, but using slashes (/) instead of dots (.) as the separator character.