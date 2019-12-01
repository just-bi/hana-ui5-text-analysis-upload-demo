var pkg = this.document.location.pathname.split('/').slice(1, -2);
var odataService = [].concat(pkg, ['service', 'ta']);  

/**
 * OData
 */
var modelName = 'data';
var model = new sap.ui.model.odata.v2.ODataModel('/' + odataService.join('/') + '.xsodata', {
  disableHeadRequestForToken: true
});
model.attachRequestFailed(function(event){
  event.getSource().resetChanges();
});
var filesEntityName = 'Files';
var fileNamePath = 'FILE_NAME';
var textAnalysisEntityName = 'TextAnalysis';

var metaModelName = 'meta';
var metaModel = model.getMetaModel();

/**
 * UI Tables
 */
function createTable(entityName, sorters, columnNames){
  var table = new sap.ui.table.Table({
    visibleRowCountMode: sap.ui.table.VisibleRowCountMode.Auto,
    selectionMode: sap.ui.table.SelectionMode.Single,
    selectionBehavior: sap.ui.table.SelectionBehavior.RowOnly,
    enableBusyIndicator: true,
    busyIndicatorDelay: 0,
    showColumnVisibilityMenu: true
  });
  table.setModel(model, modelName);
  table.setModel(metaModel, metaModelName);
  var bindingConfig = {
    model: modelName,
    path: '/' + entityName,
    sorter: sorters
  };
  if (columnNames && columnNames.length) {
    bindingConfig.parameters = {
      select: columnNames.join(',')
    };
  }
  table.bindRows(bindingConfig);
  return table;
}

function bindColumns(table, columnConfigs) {
  columnConfigs = columnConfigs || {};
  var rowsBinding = table.getBinding('rows');
  var entityName = rowsBinding.getPath().slice(1);
  var metaModel = rowsBinding.getModel().getMetaModel();
  var entity = metaModel.getODataEntitySet(entityName);
  var entityType = metaModel.getODataEntityType(entity.entityType);
  entityType.property.forEach(function(property, index){
    var propertyName = property.name;
    var columnConfig = columnConfigs[propertyName];
    if (columnConfig === undefined) {
      columnConfig = {};
    }
    if (columnConfig === false || columnConfig.include === false) {
      return;
    }
    
    var template = new sap.m.Text({
      wrapping: false,
      maxLines: 1
    });
    var typeParts = property.type.split('.');
    var typeName = typeParts[1];
    var type = sap.ui.model.odata.type[typeParts[1]];
    var formatOptions
    template.bindText({
      model: modelName,
      path: propertyName,
      type: type ? 'sap.ui.model.odata.type.' + typeName : undefined,
      formatOptions: typeName === 'Date' ? {UTC: true, style: 'short'} : ''
    });
    if (typeName.startsWith('Int')) {
      template.setTextAlign(sap.ui.core.TextAlign.Right);
      template.setWidth('100%');
    }
    
    table.addColumn(new sap.ui.table.Column({
      name: propertyName,
      label: propertyName,
      filterProperty: propertyName,
      sortProperty: propertyName,
      template: template,
      autoResizable: true,
      filterType: type,
      visible: columnConfig.visible === undefined ? true : columnConfig.visible 
    }));
  });
}

var filesTable = createTable(filesEntityName, [
  new sap.ui.model.Sorter('FILE_LAST_UPLOADED', true)
], [
  fileNamePath,
  'FILE_TYPE',
  'FILE_SIZE',
  'FILE_LAST_MODIFIED',
  'FILE_LAST_UPLOADED'
]);

var contextToDelete = null;
var confirmDeleteDialog = new sap.m.Dialog({
  draggable: true,
  icon: 'sap-icon://delete',
  title: 'Confirm Delete File'
});
var confirmDeleteText = new sap.m.Text();
confirmDeleteDialog.addContent(confirmDeleteText);
confirmDeleteDialog.addButton(new sap.m.Button({
  text: 'Delete',
  press: function(){    
    var model = contextToDelete.getModel();
    model.remove(contextToDelete.getPath());
    model.submitChanges({
      success: function(){                
        closeConfirmDeleteDialog();
      }
    });
  }
}));
confirmDeleteDialog.addButton(new sap.m.Button({
  text: 'Cancel',
  press: function(){    
    closeConfirmDeleteDialog();
  }
}));

function openConfirmDeleteDialog(){
  var fileName = contextToDelete.getObject()[fileNamePath];
  confirmDeleteText.setText('Are you sure you want to delete the file "' + fileName + '"?');
  confirmDeleteDialog.open();
}
function closeConfirmDeleteDialog(){
  contextToDelete = null;
  confirmDeleteDialog.close();
}

var rowAction = new sap.ui.table.RowAction();
rowAction.addItem(new sap.ui.table.RowActionItem({
  icon: 'sap-icon://delete',
  type: sap.ui.table.RowActionType.Delete,
  press: function(event){
    contextToDelete = null;
    var row = event.getParameter("row");
    contextToDelete = row.getBindingContext(modelName);
    openConfirmDeleteDialog();
  }
}));
filesTable.setRowActionTemplate(rowAction);
filesTable.setRowActionCount(rowAction.getItems().length);

var analysisTable = createTable(textAnalysisEntityName );

filesTable.attachRowSelectionChange(function(event){
  filterAnalysisTable();
});
filesTable.getBinding("rows").attachDataReceived(function(){
  filesTable.setSelectedIndex(0);
  filterAnalysisTable();
});

function filterAnalysisTable(){
  var selectedIndex = filesTable.getSelectedIndex();
  var context = filesTable.getContextByIndex(selectedIndex);
  var fileName;
  if (context) {
    var boundObject = context.getObject();
    fileName = boundObject[fileNamePath];
  }
  else {
    fileName = null;
  }
  var rowsBinding = analysisTable.getBinding("rows");
  rowsBinding.filter(new sap.ui.model.Filter({
    path: fileNamePath,
    operator: sap.ui.model.FilterOperator.EQ,
    value1: fileName
  }), sap.ui.model.FilterType.Application);
}

metaModel.loaded().then(function(){
  bindColumns(filesTable, {
    "FILE_TYPE": { visible: false },
    "FILE_LAST_MODIFIED": { visible: false },
    "FILE_SIZE": { visible: false },
    "FILE_LAST_UPLOADED": { visible: false },
    "FILE_CONTENT": false
  });
  bindColumns(analysisTable, {
    "FILE_NAME": false
  });
});

/**
 * File uploader
 */
var fileToUpload;
var fileToUploadExists;
function onFileToUploadChanged(event){
  fileToUpload = null;
  fileToUploadExists = false;
  var files = event.getParameter('files');
  if (files.length === 0) {
    initFileUploadDialog();
    return;
  }
  fileToUpload  = files[0];
  fileUploader.setBusy(true);
  model.read('/' + filesEntityName, {
    filters: [new sap.ui.model.Filter({
      path: fileNamePath,
      operator: sap.ui.model.FilterOperator.EQ,
      value1: fileToUpload.name
    })],
    urlParameters: {
      $select: [fileNamePath, 'FILE_LAST_MODIFIED']
    },            
    success: function(data){
      fileUploader.setBusy(false);
      var valueState, valueStateText;
      switch (data.results.length) {
        case 0:
          valueState = sap.ui.core.ValueState.Information;
          valueStateText = 'New File will be uploaded.';
          fileToUploadExists = false;
          confirmUploadButton.setEnabled(true);    
          break;
        case 1:
          valueState = sap.ui.core.ValueState.Warning;
          valueStateText = 'Existing file will be overwritten.';
          fileToUploadExists = true;
          confirmUploadButton.setEnabled(true);    
          break;
        default:
          valueState = sap.ui.core.ValueState.Error;
          valueStateText = 'Multiple existing files with this name.';
          fileToUploadExists = true;
      }
      fileUploader.setValueState(valueState);
      fileUploader.setValueStateText(valueStateText);
    },
    error: function(error){
      fileUploader.setBusy(false);
      var valueState, valueStateText;
      valueState = sap.ui.core.ValueState.Error;
      confirmUploadButton.setEnabled(false);
    }
  });
}
var fileUploader = new sap.ui.unified.FileUploader({
  buttonText: 'Browse File...',
  change: onFileToUploadChanged,
  busyIndicatorDelay: 0
});

function uploadFile(){
  var fileReader = new FileReader();
  fileReader.onload = function(event){
    var binaryString = event.target.result;
    var payload = {
      "FILE_NAME": fileToUpload.name,
      "FILE_TYPE": fileToUpload.type,
      "FILE_LAST_MODIFIED": new Date(fileToUpload.lastModified),
      "FILE_SIZE": fileToUpload.size,
      "FILE_CONTENT": btoa(binaryString),
      "FILE_LAST_UPLOADED": new Date(Date.now())
    };
    if (fileToUploadExists) {
      model.update(
        '/' + model.createKey(filesEntityName, {
          "FILE_NAME": fileToUpload.name
        }), 
        payload
      );
    }
    else {
      model.createEntry('/' + filesEntityName, {
        properties: payload
      });
    }
    model.submitChanges({
      success: function(){                
        closeUploadDialog();                
      }
    });
  };
  fileReader.readAsBinaryString(fileToUpload);
} 

/**
 * File upload dialog
 */
var uploadDialog = new sap.m.Dialog({
  draggable: true,
  icon: 'sap-icon://upload',
  title: 'Upload File'
});
uploadDialog.addContent(fileUploader);
var confirmUploadButton = new sap.m.Button({
  text: 'Upload',
  press: uploadFile
});
uploadDialog.addButton(confirmUploadButton);
uploadDialog.addButton(new sap.m.Button({
  text: 'Cancel',
  press: function(){
    closeUploadDialog();
  }
}));

function initFileUploadDialog(){
  confirmUploadButton.setEnabled(false);
  valueState = sap.ui.core.ValueState.Information;
  valueStateText = 'Choose a file.';
  fileUploader.setValueState(valueState);
  fileUploader.setValueStateText(valueStateText);
  fileUploader.setValue('');
}

function openUploadDialog(){
  initFileUploadDialog();
  uploadDialog.open();
}

function closeUploadDialog(){          
  uploadDialog.close();
}

function onUploadPressed(event) {
  openUploadDialog();
}

/**
 * App, Page, Toolbar and Splitter
 */
var page = new sap.m.Page({
  title: 'Text Analysis Demo',
  enableScrolling: false
});        
page.addStyleClass('sapUiNoMargin');

var toolbar = new sap.m.Bar();
toolbar.addContentLeft(new sap.m.Button({
  icon: 'sap-icon://upload',
  text: 'Upload File for Text Analysis',
  tooltip: 'Click to upload a file for text analysis.',
  press: onUploadPressed
}));

toolbar.addContentMiddle(new sap.m.Title({text: 'Just-Bi.nl - SAP HANA Text Analysis Ui5 Demo App'}));

toolbar.addContentRight(new sap.m.Button({
  icon: 'https://www.just-bi.nl/wp-content/uploads/2018/09/Just-BI-insight-2018v3.svg',
  tooltip: 'Just-Bi Homepage',
  press: function(){
    window.open('http://www.just-bi.nl/');
  }
}));
toolbar.addContentRight(new sap.m.Button({
  icon: 'https://github.githubassets.com/pinned-octocat.svg',
  tooltip: 'Check out this app on github',
  press: function(){
    window.open('https://github.com/just-bi/hana-ui5-text-analysis-upload-demo');
  }
}));
toolbar.addContentRight(new sap.m.Button({
  icon: 'sap-icon://sys-help',
  tooltip: 'Help and explanation',
  press: function(){
    window.open('http://rpbouman.blogspot.com/2019/12/building-ui5-demo-for-sap-hana-text_28.html');
  }
}));
page.setCustomHeader(toolbar);

var splitter = new sap.ui.layout.Splitter({
  orientation:  sap.ui.core.Orientation.Horizontal,
  width: '100%',
  height: '100%'
});
filesTable.setLayoutData(new sap.ui.layout.SplitterLayoutData({
  size: '400px'
}));
splitter.addContentArea(filesTable);
splitter.addContentArea(analysisTable);
page.addContent(splitter);

var app = new sap.m.App();
app.addPage(page);
app.placeAt('body');