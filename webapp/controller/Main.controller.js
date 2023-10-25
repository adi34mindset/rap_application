sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/ColumnListItem",
    "sap/m/Input",
    "sap/ui/model/Filter", 
    "sap/ui/model/FilterOperator",
    'sap/ui/core/util/Export',
    'sap/ui/core/util/ExportTypeCSV',
    'sap/m/Label',
    'sap/ui/comp/smartvariants/PersonalizableInfo',
    'sap/ui/core/format/DateFormat'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller,MessageToast,ColumnListItem,Input,Filter,FilterOperator,Export,ExportTypeCSV,Label,PersonalizableInfo,DateFormat) {
        "use strict";
        var mode = 'default';
        var controller, selPath, oDataModel;
        return Controller.extend("com.mindset.ad.rapapp.controller.Main", {
            onInit: function () {
                oDataModel = new sap.ui.model.odata.ODataModel('/sap/opu/odata/sap/ZUI_SOV2_AP/', true);
                sap.ui.getCore().setModel(oDataModel,"mainModel");
                this._oDateFormat = DateFormat.getDateInstance({
                    pattern: "yyyy-MM-dd"
                });
                this.oFilterBar = this.getView().byId("filterbar");
                this.oTable = this.getView().byId("table0");
			    this.applyData = this.applyData.bind(this);
			    this.fetchData = this.fetchData.bind(this);
                this.getFiltersWithValues = this.getFiltersWithValues.bind(this);
			    this.oSmartVariantManagement = this.getView().byId("svm");
                this.oExpandedLabel = this.getView().byId("expandedLabel");
                this.oSnappedLabel = this.getView().byId("snappedLabel");
                this.oFilterBar.registerFetchData(this.fetchData);
                this.oFilterBar.registerApplyData(this.applyData);
                this.oFilterBar.registerGetFiltersWithValues(this.getFiltersWithValues);
                controller = this;
                var oPersInfo = new PersonalizableInfo({
                    type: "filterBar",
                    keyName: "persistencyKey",
                    dataSource: "",
                    control: this.oFilterBar
                });
                this.oSmartVariantManagement.addPersonalizableControl(oPersInfo);
                this.oSmartVariantManagement.initialise(function () {}, this.oFilterBar);
            },
            onExit: function() {
                this.oDataModel = null;
                this.oSmartVariantManagement = null;
                this.oExpandedLabel = null;
                this.oSnappedLabel = null;
                this.oFilterBar = null;
                this.oTable = null;
            },
            onSearch: function(oEvent) {
                var aFilter = [];
			    var sQuery = oEvent.getParameter("query");
                if (sQuery) {
                    aFilter.push(new Filter("CustomerName",FilterOperator.Contains,sQuery,false));
                }
                const oTable = this.byId("table0");
			    const oBinding = oTable.getBinding("rows");
			    oBinding.filter(aFilter);
            },
            onDataExport : function(oEvent) {
                var oExport = new Export({
    
                    // Type that will be used to generate the content. Own ExportType's can be created to support other formats
                    exportType : new ExportTypeCSV({
                        separatorChar : ";"
                    }),
    
                    // Pass in the model created above
                    models : this.getView().getModel("mainModel"),
    
                    // binding information for the rows aggregation
                    rows : {
                        path : "/SalesOrder"
                    },
    
                    // column definitions with column name and binding info for the content
    
                    columns : [{
                        name : "So Number",
                        template : {
                            content : "{SoNumber}"
                        }
                    }, {
                        name : "Customer Name",
                        template : {
                            content : "{CustomerName}"
                        }
                    }, {
                        name : "Customer Number",
                        template : {
                            content : "{CustomerNumber}"
                        }
                    }, 
                    {
                        name : "Order Date",
                        template : {
                            content : "{OrderDate}"
                        }
                    }, {
                        name : "Inquiry Number",
                        template : {
                            content : "{InquiryNumber}"
                        }
                    }]
                });
    
                // download exported file
                oExport.saveFile().catch(function(oError) {
                    MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
                }).then(function() {
                    oExport.destroy();
                });
            },
            fetchData: function () {
                var aData = this.oFilterBar.getAllFilterItems().reduce(function (aResult, oFilterItem) {
                    aResult.push({
                        groupName: oFilterItem.getGroupName(),
                        fieldName: oFilterItem.getName(),
                        fieldData: oFilterItem.getControl().getSelectedKeys()
                    });

                    return aResult;
                }, []);

                return aData;
            },
            applyData: function (aData) {
                aData.forEach(function (oDataObject) {
                    var oControl = this.oFilterBar.determineControlByName(oDataObject.fieldName, oDataObject.groupName);
                    oControl.setSelectedKeys(oDataObject.fieldData);
                }, this);
            },
            getFiltersWithValues: function () {
                var aFiltersWithValue = this.oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
                    var oControl = oFilterGroupItem.getControl();
    
                    if (oControl && oControl.getSelectedKeys && oControl.getSelectedKeys().length > 0) {
                        aResult.push(oFilterGroupItem);
                    }
    
                    return aResult;
                }, []);
    
                return aFiltersWithValue;
            },
            onSelectionChange: function (oEvent) {
                this.oSmartVariantManagement.currentVariantSetModified(true);
                this.oFilterBar.fireFilterChange(oEvent);
            },
            onGlobalSearch: function (oEvent) {
                var aTableFilters = this.oFilterBar.getFilterGroupItems().reduce(function (aResult, oFilterGroupItem) {
                    var oControl = oFilterGroupItem.getControl(),
                        aSelectedKeys = oControl.getSelectedKeys(),
                        aFilters = aSelectedKeys.map(function (sSelectedKey) {
                            return new Filter({
                                path: "SoNumber",
                                operator: FilterOperator.Contains,
                                value1: sSelectedKey
                            });
                        });
    
                    if (aSelectedKeys.length > 0) {
                        aResult.push(new Filter({
                            filters: aFilters,
                            and: false
                        }));
                    }
    
                    return aResult;
                }, []);
    
                this.oTable.getBinding("rows").filter(aTableFilters);
                this.oTable.setShowOverlay(false);
            },
            onFilterChange: function (oEvent) {
                this._updateLabelsAndTable();
            },
            onAfterVariantLoad: function () {
                this._updateLabelsAndTable();
            },
            getFormattedSummaryText: function() {
                var aFiltersWithValues = this.oFilterBar.retrieveFiltersWithValues();
    
                if (aFiltersWithValues.length === 0) {
                    return "No filters active";
                }
    
                if (aFiltersWithValues.length === 1) {
                    return aFiltersWithValues.length + " filter active: " + aFiltersWithValues.join(", ");
                }
    
                return aFiltersWithValues.length + " filters active: " + aFiltersWithValues.join(", ");
            },
    
            getFormattedSummaryTextExpanded: function() {
                var aFiltersWithValues = this.oFilterBar.retrieveFiltersWithValues();
    
                if (aFiltersWithValues.length === 0) {
                    return "No filters active";
                }
    
                var sText = aFiltersWithValues.length + " filters active",
                    aNonVisibleFiltersWithValues = this.oFilterBar.retrieveNonVisibleFiltersWithValues();
    
                if (aFiltersWithValues.length === 1) {
                    sText = aFiltersWithValues.length + " filter active";
                }
    
                if (aNonVisibleFiltersWithValues && aNonVisibleFiltersWithValues.length > 0) {
                    sText += " (" + aNonVisibleFiltersWithValues.length + " hidden)";
                }
    
                return sText;
            },
            _updateLabelsAndTable: function () {
                this.oExpandedLabel.setText(this.getFormattedSummaryTextExpanded());
                this.oSnappedLabel.setText(this.getFormattedSummaryText());
                this.oTable.setShowOverlay(true);
            },
            getDialog: function () {
                var oView = controller.getView();
			    if (!this.dialog) {
				// This fragment can be instantiated from a controller as follows:
				    this.dialog = sap.ui.xmlfragment("idFragment","com.mindset.ad.rapapp.fragments.Create", this);
				//debugger;
				    oView.addDependent(controller.dialog);
			    }
			//debugger;
			    return this.dialog;
            },
            onPressCreate: function(){
                mode = 'create';
                this.getDialog().open();
            },
            onCloseCreate: function () {
                this.getDialog().close();
            },
            onDelDialog: function(){
                var oView = controller.getView();
                // create a fragment with dialog, and pass the selected data
                if (!this.pdialog) {
                    // This fragment can be instantiated from a controller as follows:
                    this.pdialog = sap.ui.xmlfragment("idFragment","com.mindset.ad.rapapp.fragments.Delete", this);
                    //debugger;
                    oView.addDependent(controller.pdialog);
                }
                return this.pdialog;

            },
            onPressDelete: function(oEvent){
                this.onDelDialog().open();
            },
            onDeleteField: function(){
                var oModel = controller.getView().getModel("mainModel");
                oDataModel.remove(selPath, {
                    method: "DELETE",
                    success: function(Response) {
                        oModel.refresh();
                        MessageToast.show("Deleted Successfully!");
                    },
                    error: function(Error) {
                        MessageToast.show("Deletion Failed!");
                    }
                });
                sap.ui.getCore().getModel("mainModel").refresh(true);
                this.onDelDialog().close();
            },
            closeDelete: function () {
                 this.onDelDialog().close();
            },
            onCreateMat: function(oEvent){
                var oModel = controller.getView().getModel("mainModel");
			    var reqId = sap.ui.getCore().byId("idFragment--i1").getValue();
                var orderDate = sap.ui.getCore().byId("idFragment--i4").getValue();
                var oDate = this._oDateFormat.parse(orderDate); // Parse the date string
                // var validDate = this._oDateFormat.format(oDate)
                var payload = {
                    "SoNumber": reqId,
                    "CustomerName": sap.ui.getCore().byId("idFragment--i2").getValue(),
                    "CustomerNumber": sap.ui.getCore().byId("idFragment--i3").getValue(),
				    "OrderDate": oDate,
                    "InquiryNumber": sap.ui.getCore().byId("idFragment--i5").getValue()
                }
                if(mode === 'create'){
				    oDataModel.create('/SalesOrder',payload,null,
				    function(Response){
                        oModel.refresh();
					    MessageToast.show('Data Added Successfully!');
				    },
				    function(Error){
					    MessageToast.show('Error');
				    });
                    sap.ui.getCore().getModel("mainModel").refresh(true);
                    this.getDialog().close();
			    }
            },
            onSelectionChange: function(oEvent){
                selPath = oEvent.getParameters().rowContext.getPath();
            },
            onEditDialog: function(){
                var oView = controller.getView();
                // create a fragment with dialog, and pass the selected data
                if (!this.edialog) {
                    // This fragment can be instantiated from a controller as follows:
                    this.edialog = sap.ui.xmlfragment("idFragment","com.mindset.ad.rapapp.fragments.Update", this);
                    //debugger;
                    oView.addDependent(controller.edialog);
                }
                return this.edialog;
            },
            onEditMode: function(oEvent){
                var editData = oEvent.getSource().getModel("mainModel").getProperty(selPath);
                this.onEditDialog().open();
                sap.ui.getCore().byId("idFragment--i1").setValue(editData.SoNumber);
			    sap.ui.getCore().byId("idFragment--i2").setValue(editData.CustomerName);
			    sap.ui.getCore().byId("idFragment--i3").setValue(editData.CustomerNumber);
			    sap.ui.getCore().byId("idFragment--i4").setValue(editData.OrderDate);
			    sap.ui.getCore().byId("idFragment--i5").setValue(editData.InquiryNumber);
            },
            onCloseEdit: function(){
                this.onEditDialog().close();
            },
            onPressEdit: function(){
                var oModel = controller.getView().getModel("mainModel");
			    var reqId = sap.ui.getCore().byId("idFragment--i1").getValue();
                var orderDate = sap.ui.getCore().byId("idFragment--i4").getValue();
                var oDate = this._oDateFormat.parse(orderDate); // Parse the date string
                // var validDate = this._oDateFormat.format(oDate)
                var payload = {
                    "SoNumber": reqId,
                    "CustomerName": sap.ui.getCore().byId("idFragment--i2").getValue(),
                    "CustomerNumber": sap.ui.getCore().byId("idFragment--i3").getValue(),
				    "OrderDate": oDate,
                    "InquiryNumber": sap.ui.getCore().byId("idFragment--i5").getValue()
                }
                oDataModel.update("/SalesOrder('"+reqId+"')",payload,null,
				    function(Response){
					    oModel = oDataModel;
					    oModel.refresh();
					    MessageToast.show('Details Updated.');
				    },
				    function(Error){
					    MessageToast.show('Error');
				    });
                    this.onEditDialog().close();
            }
        });
    });
