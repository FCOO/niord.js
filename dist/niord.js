/****************************************************************************
	niord.js,

	(c) 2018, FCOO

	https://github.com/FCOO/niord
	https://github.com/FCOO

    Create a Messages-object and Publications-object in global namespace window.Niord

****************************************************************************/
(function ($, window/*, document, undefined*/) {
	"use strict";

    //Create namespace
    window.Niord = window.Niord || {};
	var ns = window.Niord,

    //Load status
        NOTHING = 'NOTHING',
        LOADING = 'LOADING',
        LOADED  = 'LOADED',
        ERROR   = 'ERROR',

    //Default options and paths
        defaultOptions = {
            domains: [
                'niord-nw',   //All Danish navigational warnings are produced in the "niord-nw" domain.
                'niord-nm',   //All Danish Notices to Mariners are produced in the "niord-nm" domain.
                'niord-fa',   //All Danish firing areas are defined as miscellaneous Notices to Mariners in the "niord-fa" domain.
                'niord-fe'    //The actual firing exercises are maintained as local navigational warnings in the "niord-fe" domain.
            ]
        },
        baseUrl         = 'https://niord.dma.dk/rest/public/v1/',
        dateFormatParam = '?dateFormat=UNIX_EPOCH',
        messagesUrl     = baseUrl + 'messages',
        publicationsUrl = baseUrl + 'publications' + dateFormatParam,
        domainParam     = '&domain=',

        domainDefaultShortTitle = {
            'FA': {da: 'Skydeområde', en: 'Firing Area'},
            'FE': {da: "Skydeøvelser. Advarsel", en: "Firing exercises. Warning"}
        },

        messageIndex = 0;


    //trim(str) trim str for leading and tail space and punctuation
    function trim( str ){
        return str.replace(/^[\., ]+|[\., ]+$/g, "");
    }


    /********************************************
    domainUrl( domains ) - Return the url to retrive info from one or more domain(s)
    ********************************************/
    function domainUrl( domains ){
        domains = $.isArray( domains ) ? domains : [domains];
        return messagesUrl + dateFormatParam + domainParam + domains.join(domainParam);
    }

    /********************************************
    messageUrl( id ) - Return the url to retrive info from one message
    ********************************************/
    function messageUrl( id ){
        return baseUrl + 'message/' + id + dateFormatParam;
    }

    /********************************************
    arrayToPhrases( content ) - Convert contentArray
    from    [] of { lang:STRING, id1:content1_lang, id2:content2_lang,.. idN:contentN_lang }
    to      {
                id1: {da: content1_da, en: content1_en},
                id2: {da: content2_da, en: content2_en}
                ...
                idN: {da: contentN_da, en: content2_en}
            }
    ********************************************/
    function arrayToPhrases( contentArray, owner ){
        var result = {};
        $.each( contentArray, function( index, content ){
            var lang = content.lang;
            $.each( content, function( id, value ){
                if ((id != 'lang') && value){
                    result[id] = result[id] || {};
                    result[id][lang] = value;
                }
            });
        });
        if (owner)
            $.extend(owner, result);
        else
            return result;
    }



    /***********************************************************
    Area
    ***********************************************************/
    ns.Area = function( data, messages ){
        //this.messages = messages;
        this.id = data.id;
        arrayToPhrases( data.descs, this );
        this.parent = data.parent ? messages.getArea( data.parent.id, data.parent ) : null;
    };
    ns.Area.prototype = {
        getLevel: function(){
            return this.parent ? this.parent.getLevel()+1 : 0;
        }
    };

    /***********************************************************
    Category
    ***********************************************************/
    ns.Category = function( data, messages ){
        //this.messages = messages;
        this.id = data.id;
        this.mm = data.mm;
        arrayToPhrases( data.descs, this );
        this.parent = data.parent ? messages.getCategory( data.parent.id, data.parent ) : null;
    };
    ns.Category.prototype = {

    };

    /***********************************************************
    Chart
    ***********************************************************/
    ns.Chart = function( data/*, messages */){
        //this.messages = messages;
        this.id = data.chartNumber;
        $.extend( this, data );
    };
    ns.Chart.prototype = {

    };

    /***********************************************************
    Reference
    ***********************************************************/
    ns.Reference = function( data/*, messages */){
        //this.messages = messages;
        this.messageId = data.messageId;
        this.type = data.type;
        arrayToPhrases( data.descs, this );
    };
    ns.Reference.prototype = {

    };

    /***********************************************************
    Attachment
    ***********************************************************/
    ns.Attachment = function( data/*, messages */){
        //this.messages = messages;
        var _this = this;
        $.each(['type', 'path', 'fileName', 'fileSize', 'display', 'width', 'height'], function( dummy, id ){ _this[id] = data[id]; });
        arrayToPhrases( data.descs, this );
    };
    ns.Attachment.prototype = {
    };

    /***********************************************************
    DateInterval
    ***********************************************************/
    ns.DateInterval = function( data/*, messages */){
        //this.messages = messages;
        this.allDay = data.allDay;
        this.fromDate = moment( data.fromDate );
        this.toDate = data.toDate ? moment( data.toDate ) : null;
    };
    ns.DateInterval.prototype = {
    };

    /***********************************************************
    MessagePart
    ***********************************************************/
    ns.MessagePart = function( data /*, messages */){
        //this.messages = messages;
        var _this = this;
        $.each(['type', 'geometry'], function( dummy, id ){ _this[id] = data[id]; });
        arrayToPhrases( data.descs, this );

        //eventDates = []{allDay, fromDate, toDate} (if any)
        this.eventDates = data.eventDates;
        if (this.eventDates)
            $.each( this.eventDates, function( index, data ){
                _this.eventDates[index] = new ns.DateInterval( data );
            });
    };
    ns.MessagePart.prototype = {
    };

    /***********************************************************
    ************************************************************
    Message
    ************************************************************
    ***********************************************************/
    ns.Message = function( data, messages ){
        messageIndex ++;
        this.messages = messages;

        var _this = this;
        //Standard properties
        $.each(['id', 'shortId', 'type', 'mainType', 'number', 'status', 'originalInformation', 'horizontalDatum'], function( dummy, id ){ _this[id] = data[id]; });

        //serieId = e.q.'dma-fa' => domainId = 'FA'
        this.serieId  = data.messageSeries.seriesId;
        var temp = this.serieId.toUpperCase().split('-');
        this.domainId = 'NW'; //Default
        $.each( ['NW', 'NM', 'FA', 'FE'], function( index, code ){
            if (temp.indexOf(code) > -1 ){
                _this.domainId = code;
                return false;
            }
        });

        //DateTime-properties get converted to moment-object
        $.each(['created', 'updated', 'publishDateFrom', 'publishDateTo'], function( dummy, id ){
            _this[id] = data[id] ? moment(data[id]) : null;
        });

        arrayToPhrases( data.descs, this );
        //Default values
        this.horizontalDatum = this.horizontalDatum || 'WGS-84';

        //Convert different simple lists
        var listInfos = [
                {listId: 'areaList',       objectId: 'areas',       getMethodId  : 'getArea'                           },
                {listId: 'categoryList',   objectId: 'categories',  getMethodId  : 'getCategory'                       },
                {listId: 'chartList',      objectId: 'charts',      getMethodId  : 'getChart',     idId: 'chartNumber' },
                {listId: 'referenceList',  objectId: 'references',  getMethodId  : 'getReference', idId: 'messageId'   },
                {listId: 'attachmentList', objectId: 'attachments', constructorId: 'Attachment'                        },
                {listId: 'partList',       objectId: 'parts',       constructorId: 'MessagePart',  idId: 'indexNo'     },
            ];

        $.each( listInfos, function( index, listInfo ){
            _this[listInfo.objectId] = {};
            _this[listInfo.listId] = [];
            var idId = listInfo.idId || 'id',
                listIndex = 0;
            $.each( data[listInfo.objectId] || [], function( index, data ){
                //If a get-function is given; use it ELSE create only 'local'
                var id = data[idId] || listIndex++,
                    child = listInfo.getMethodId ? _this.messages[listInfo.getMethodId]( id, data ) : new ns[listInfo.constructorId]( data, _this.messages );

                child.id = id;
                child.message = _this;
                _this[listInfo.objectId][id] = child;
                _this[listInfo.listId].push(child);
            });
        });

        //Convert "partList" into lists named "[TYPE]List"
        $.each(this.partList, function(index, part){
            var listName = part.type.toLowerCase() + 'List',
                list = _this[listName] = _this[listName] || [];
            list.push( part );
        });

        //CREATE AND ADJUST AREA INFO
        //Create areaLevelList = [level] of [] of Area
        this.areaLevelList = [];
        $.each( this.areaList, function( index, area ){
            while (area){
                while ( _this.areaLevelList.length <= area.getLevel() )
                    _this.areaLevelList.push([]);
                _this.areaLevelList[area.getLevel()].push(area);
                area = area.parent;
            }
        });

        //Remove any dublicates in this.areaLevelList[]
        $.each( this.areaLevelList, function( index, areaList ){
            _this.areaLevelList[index] =
                areaList.filter( function(elem, pos, arr) {
                    return arr.indexOf(elem) == pos;
                });
        });

        //Create mainArea = [] of the first level-0 area and its level-1 area (if any)
        //Create areaTitle = string with first two area-levels
        //this.subAreaTitle = this.vicinity or level 2 of area
        this.mainArea     = [];
        this.mainAreaName = [];
        this.areaTitle = {da:'', en:''};
        if (this.areaLevelList.length)
            this.mainArea.push( this.areaLevelList[0][0] );
        $.each( this.areaLevelList[1], function( index, area ){
            if (area.parent === _this.mainArea[0]){
                _this.mainArea.push( area );
                return false;
            }
        });
        $.each( this.mainArea, function( index, area ){
            _this.mainAreaName.push( area.name );
            _this.areaTitle.da = _this.areaTitle.da + (index ? ' - ' : '') + area.name.da;
            _this.areaTitle.en = _this.areaTitle.en + (index ? ' - ' : '') + area.name.en;
        });

        //this.subAreaTitle = this.vicinity or level 2 of area
        this.subAreaTitle = this.vicinity || (this.areaLevelList.length > 2 ? this.areaLevelList[2][0].name : null);

        //CREATE AND ADJUST PUBLICATION INFO
        //Convert the html-strings in this.publication to list of {text:{da,en}, link:{da,en}}
        this.publications = {};
        var nextId = 0;

        if (this.publication){
            var tempPublication = {};
            $.each(['da', 'en'], function( index, lang ){
                $( $.parseHTML(_this.publication[lang] || '') ).each( function( index, elem ){
                    var text = '', link = '', id = '';
                    if (elem.nodeType == 1){
                        var $elem = $(elem);
                        text = trim($elem.text());

                        id = $elem.attr('publication') || '_' + nextId++;
                        link = $elem.attr('href') || '';
                    }
                    else
                        if (elem.nodeType == 3){
                            text = trim( elem.textContent.replace(/\u00a0/g, "") );
                            id = '_' + nextId++;
                        }
                    if (text){
                        //Update temp list of publications
                        var publication = tempPublication[id] || {text:{da:'', en:''}, link:{da:'', en:''}};
                        publication.text[lang] = text;
                        publication.link[lang] = link;
                        tempPublication[id] = publication;
                    }
                });
            });

            //Transform tempPublication to local and global list
            $.each( tempPublication, function( id, pub ){
                //If exact version of pub existe => use if, else create new version
                var globalPub = _this.messages.publications[id];
                if (globalPub && (pub.text.da == globalPub.text.da) && (pub.text.en == globalPub.text.en) && (pub.link.da == globalPub.link.da) && (pub.link.en == globalPub.link.en))
                    pub = globalPub;
                else {
                    if (globalPub)
                        id = id + '_' + messageIndex;
                    _this.messages.publications[id] = pub;
                }
                _this.publications[id] = pub;
            });
        } //end of if (this.publication){


        //CREATE SHORTTITLE
        //Try to separate areas from this.title to get the rest as a small title. Not pretty :-)
        function getShortTitle(lang, mess){
            var shortTitle = '',
                areaTitle  = '';
            function add( text ){
                if (text)
                    areaTitle = (areaTitle ? areaTitle + '. ':'') + text;
            }
            $.each(mess.areaLevelList, function( index, areaList ){
                $.each(areaList, function( index, area ){
                    add( area.name[lang] );
                });
            });
            if (mess.vicinity)
                add(mess.vicinity[lang]);

            var title = $.trim(mess.title[lang]);
            areaTitle = $.trim(areaTitle);

            //If the first part of title == areaTitle => last part is shortTitle (trimmed for space and ".")
            if (title.indexOf(areaTitle) == 0){
                shortTitle = title.replace(areaTitle, '');

                //Trim leading and trailing "."
                shortTitle = trim(shortTitle);
            }

            return shortTitle;
        }
        this.shortTitle = {da: getShortTitle('da', this), en: getShortTitle('en', this)};

        if (!this.shortTitle.da && !this.shortTitle.en)
            this.shortTitle = domainDefaultShortTitle[this.domainId];


        //CREATE GEOJSON
        var geoJSONList = [];
        $.each(this.partList, function(index, part){
            if (part.geometry)
                geoJSONList.push(part.geometry);
        });
        this.geoJSON = geoJSONList.length ? window.GeoJSON.merge(geoJSONList) : null;

        //Update properties of all feature in this.geoJSON
        if (this.geoJSON && this.geoJSON.features){
            var newFeatures = [];
            $.each( this.geoJSON.features, function(dummy, feature ){
                var prop = feature.properties = feature.properties || {};
                prop.niordMessage = _this;

                //Convert properties name:da (if any) to name:{da, en}
                if (prop['name:da'] || prop['name:en'])
                    prop.name = {da: prop['name:da'] || '', en: prop['name:en'] || ''};

                //Convert properties name:0:da, name:1:da,... (if any) to nameList: []{da, en}
                var nameList = [];

                var endIndex = prop.startCoordIndex + feature.geometry.coordinates.length;
                for (var index = 0; index <= endIndex; index++ ){
                    var da = prop['name:'+index+':da'],
                        en = prop['name:'+index+':en'];
                    if (da || en){
                        nameList[index] = {da: da || '', en: en || ''};
                        delete prop['name:'+index+':da'];
                        delete prop['name:'+index+':en'];
                    }
                }

                //Set coordIndex for consistent
                if (feature.geometry.type == 'Point')
                    prop.coordIndex = prop.startCoordIndex;

                //If the feature is a multiPoint => convert it to NxPoint and copy properties and try to match name from nameList
                if (feature.geometry.type == 'MultiPoint'){
                    var hasCoordIndex = $.type(feature.properties.startCoordIndex) == 'number',
                        startCoordIndex = feature.properties.startCoordIndex;

                    $.each( feature.geometry.coordinates, function( coorIndex, coor ){
                        var newFeature = {
                                type: "Feature",
                                geometry: {
                                    type: "Point",
                                    coordinates: $.extend({}, coor)
                                },
                                properties: $.extend({}, prop)
                            };

                        //Use name from nameList (if any)
                        if (!!nameList[coorIndex])
                            newFeature.properties.name = nameList[coorIndex];

                        //Set and inc coordIndex
                        if (hasCoordIndex)
                            newFeature.properties.coordIndex = startCoordIndex + coorIndex;


                        newFeatures.push(newFeature);
                    });
                }
                else {
                    if (nameList.length)
                        prop.nameList = nameList;

                    newFeatures.push(feature);
                }

            });
            this.geoJSON.features = newFeatures;
        }

    }; //end of ns.Message

    ns.Message.prototype = {
    };


    /***********************************************************
    ************************************************************
    Messages
    ************************************************************
    ***********************************************************/
    ns.Messages = function( options ){
        this.options = $.extend( defaultOptions, options || {} );
        this.url = domainUrl(this.options.domains);
        this.init();
    };

    //Extend the prototype
	ns.Messages.prototype = {
        init: function(){
            this.status = NOTHING;
            this.resolveList = [];  //List of functions to be called when data is loaded
            this.rejectList  = [];   //List of functions to be called when loading fails
            this.childList   = [];

            this.messages = {};
            this.messagesByShortId = {};
            this.areas = {};
            this.references = {};
            this.categories = {};
            this.charts = {};
            this.publications = {};
        },

		/*************************************************
        getMessages( domain, resolve, reject)
        *************************************************/
        getMessages: function( domain, resolve, reject ){
            this._getChildren(  domain, resolve, reject );
        },

        _getChildren: function( domain, resolve, reject ){
            var resolveObj = resolve ? {domain: domain, resolve: resolve} : null;
            if (resolveObj)
                this.resolveList.push( resolveObj );
            var rejectObj = reject ? {domain: domain, reject: reject} : null;
            if (rejectObj)
                this.rejectList.push( rejectObj );

            switch (this.status){
                case 'NOTHING': this.load(); break;
                case 'LOADING':              break; //Nothing - just wait
                case 'LOADED' : resolveObj ? this._resolveObj( resolveObj ) : null; break;
                case 'ERROR'  : rejectObj  ? resolveObj.reject( resolveObj.domain ) : null; break;
            }
        },

        /*************************************************
        load
        *************************************************/
        load: function(){
            this.status = LOADING;
            Promise.getJSON(
                this.url,
                {},
                $.proxy( this._resolve, this),
                $.proxy( this.reject, this)
            );
        },

		/*************************************************
        _resolve - process the data and call resolve-functions
        *************************************************/
        _resolve: function( data ){
            var _this = this;
            this.childList = [];
            this.resolve( data );
            this.status = LOADED;
            $.each( this.resolveList, function( index, obj ){
                _this._resolveObj( obj );
            });
        },

        /*************************************************
        resolve - process the data
        *************************************************/
        resolve: function( data ){
            var _this = this;
            this.messages = {};
            this.messagesByShortId = {};
            this.areas = {};
            this.references = {};
            this.categories = {};
            this.charts = {};
            this.publications = {};

            //Create all Message
            $.each( data, function( index, messageData ){
                _this._addMessage( messageData, true );
            });
            this._updateReferences();

            //Create a list for each domain
            this.domainList = {};
            this.domainList['ALL'] = [];
            $.each( this.childList, function( index, message ){
                var id = message.domainId;
                _this.domainList[id] = _this.domainList[id] ? _this.domainList[id] : [];
                _this.domainList[id].push( message );
                _this.domainList['ALL'].push( message );
            });
        },

		/*************************************************
        _resolveObj - Get messages for one resolve-function and call it
        *************************************************/
        _resolveObj: function( obj ){
            var _this = this,
                id = obj.domain ? obj.domain : 'ALL',
                messageList = [];
            if (id == 'ALL')
                messageList = this.domainList[id];
            else
                //Find messagwes from one or more domain-id(s)
                $.each( $.isArray(id) ? id : id.split(' '), function( index, id ){
                    if (_this.domainList[id])
                        $.each( _this.domainList[id], function( index, mess ){
                            messageList.push( mess );
                        });
                });
            obj.resolve( messageList, obj.domain );
        },

        /*************************************************
        reject - call reject-functions when loading fails
        *************************************************/
        reject: function(){
            this.status = ERROR;
            $.each( this.rejectList, function( index, rejectObj ){
                rejectObj.reject( rejectObj.domain );
            });
        },

        /*************************************************
        _addMessage - Add a message and update references
        *************************************************/
        _addMessage: function( messageData, dontUpdateRef ){
            var message = new ns.Message( messageData, this );
            this.messages[message.id] = message;
            if (message.shortId)
                this.messagesByShortId[message.shortId] = message;
            this.childList.push( message );

            if (!dontUpdateRef)
                this._updateReferences();
        },

        /*************************************************
        _updateReferences - Update references (only possible if the message referenced to is active)
        *************************************************/
        _updateReferences: function(){
            var _this = this;
            $.each( this.messages, function( messageId, message ){
                $.each( message.references, function( id, reference ){
                    reference.message = _this.messagesByShortId[id] || null;
                });
            });
        },

        /*************************************************
        getMessage - Return the message. If the messages is not in the list and a resolve functions is given: Try loading the message
        *************************************************/
        getMessage: function( id, resolve, reject ){
            var result = this.messagesByShortId[id] || this.messages[id];
            if (!result && resolve){
                var _this = this;
                Promise.getJSON(
                    messageUrl( id ),
                    {},
                    function( data ){
                        _this._addMessage( data );
                        resolve( _this.getMessage(id) );
                    },
                    reject
                );
            }
            return result;
        },

        /*************************************************
        getMessageList - Return a list of messages. Assume the messages are loaded
        *************************************************/
        getMessageList: function( domains ){
            var result = [];
            domains =   domains ? ($.isArray( domains ) ? domains.join(' ') : domains) : '';
            $.each(this.childList, function(index, message){
                if (!domains || (domains.indexOf(message.serieId) > -1))
                    result.push( message );
            });
            return result;
        },

        /*************************************************
        _getFromList - - Return the object with id from the list with id=listId or create it
        *************************************************/
        _getFromList: function(id, data, listId, constructorId ){
            this[listId] = this[listId] || {};
            if (data && !this[listId][id])
                this[listId][id] = new ns[constructorId]( data, this );
            return this[listId][id];
        },
        getArea      : function(id, data){ return this._getFromList( id, data, 'areas',       'Area'       ); },
        getCategory  : function(id, data){ return this._getFromList( id, data, 'categories',  'Category'   ); },
        getChart     : function(id, data){ return this._getFromList( id, data, 'charts',      'Chart'      ); },
        getReference : function(id, data){ return this._getFromList( id, data, 'references',  'Reference'  ); },
    };


    /***********************************************************
    ************************************************************
    Publication
    ************************************************************
    ***********************************************************/
    ns.PublicationCategory = function( data ){
        this.id = data.categoryId;
        arrayToPhrases( data.descs, this );
        this.priority = data.priority;
        this.publish = data.publish;
    },

    ns.Publication = function( data, publications ){
        var _this = this;
        this.publications = publications;
        this.id = data.publicationId;
        arrayToPhrases( data.descs, this );

        //DateTime-properties get converted to moment-object
        $.each(['created', 'updated', 'publishDateFrom', 'publishDateTo'], function( dummy, id ){
            _this[id] = data[id] ? moment(data[id]) : null;
        });

        var categoryData = data.category,
            categoryId = categoryData.categoryId;
        if (!publications.categories[categoryId])
            publications.categories[categoryId] = new ns.PublicationCategory( categoryData );
        this.category = publications.categories[categoryId];
    },

    /***********************************************************
    ************************************************************
    Publications
    ************************************************************
    ***********************************************************/
    ns.Publications = function(){
        this.url = publicationsUrl;
        this.init();
    };

    //Extend the prototype
	ns.Publications .prototype = $.extend({}, ns.Messages.prototype, {

        getPublications: function(resolve, reject){
            this._getChildren( '', resolve, reject );
        },

        resolve: function( data ){
            var _this = this;
            this.categories = {};
            $.each( data, function( index, data ){
                var publication = new ns.Publication( data, _this );
                publication.index = _this.childList.length;
                _this.childList.push( publication );
            });

            //Sort the list by category priority
            this.childList.sort( function( p1, p2 ){
                var result = p1.category.priority - p2.category.priority;
                return result ? result : p1.index - p2.index;
            });
        },
        _resolveObj: function( obj ){
            obj.resolve( this.childList );
        },

    });


    //Create public object and methods
    ns.messages     = new ns.Messages();
    ns.publications = new ns.Publications();

    ns.getMessage      = function( id, resolve, reject ){ return ns.messages.getMessage(id, resolve, reject); };
    ns.getMessages     = function( domain, resolve, reject ){ return ns.messages.getMessages(domain, resolve, reject); };
    ns.getPublications = function( resolve, reject ){ return ns.publications.getPublications(resolve, reject); };

}(jQuery, this, document));


/*
{"id":"22c4b96b-b96c-4cd2-8db8-e203077c67df",
"created":1549447675000,
    "updated":1549543047000,
    "messageSeries":{"seriesId":"dma-nm"},
    "number":82,
    "shortId":"NM-082-19",
    "mainType":"NM",
    "type":"TEMPORARY_NOTICE",
    "status":"PUBLISHED",
    "areas":[{"id":490,
    "active":true,
    "parent":{"id":453,
    "mrn":"urn:mrn:iho:country:dk",
    "active":true,
    "descs":[{"lang":"da",
    "name":"Danmark"},
    {"lang":"en",
    "name":"Denmark"}]},
    "descs":[{"lang":"da",
    "name":"Storebælt"},
    {"lang":"en",
    "name":"The Great Belt"}]}],
    "charts":[{"chartNumber":"143",
    "internationalNumber":1369,
    "active":true,
    "scale":50000},
    {"chartNumber":"141",
    "internationalNumber":1370,
    "active":true,
    "scale":75000},
    {"chartNumber":"103",
    "internationalNumber":1303,
    "active":true,
    "scale":200000}],
    "publishDateFrom":1549543047000,
    "followUpDate":1551394800000,
    "originalInformation":true,
    "parts":[{"indexNo":0,
    "type":"DETAILS",
    "eventDates":[{"allDay":false,
    "fromDate":1549543047000}],
    "geometry":{"type":"FeatureCollection",
    "id":"eea6ce2a-9fd7-4459-a8b8-db3e76535e86",
    "features":[{"type":"Feature",
    "id":"1bc8ed5c-3911-4776-b95f-ccf750fbe329",
    "geometry":{"type":"MultiPoint",
    "coordinates":[[11.0355, 55.36250000000001], [11.0365,   55.32050000000001]]},
    "properties":{"startCoordIndex":1}}]},
    "descs":[{"lang":"da",
    "subject":"Trafiksepareringssystem suspenderes midlertidigt",
    "details":"<p><strong>Den 3. marts 2019</strong> vil trafiksepareringssystemet TSS \"Between Korsoer and Sprogoe\", mellem position 1) og 2), blive suspenderet i en periode p&aring; max. 3 timer.</p>\n<table class=\"position-table\">\n<tbody>\n<tr>\n<td class=\"pos-index\">1)</td>\n<td class=\"pos-col\">55&deg; 21, 75'N - 011&deg; 02, 13'E</td>\n</tr>\n<tr>\n<td class=\"pos-index\">2)</td>\n<td class=\"pos-col\">55&deg; 19, 23'N - 011&deg; 02, 19'E</td>\n</tr>\n</tbody>\n</table>\n<p>Det pr&aelig;cise tidspunkt for suspenderingen vil blive meddelt ved en navigationsadvarsel og p&aring; NAVTEX.</p>\n<p>Suspenderingen skyldes at fart&oslash;jet &raquo;PIONEERING SPIRIT&laquo; (9HA4112) skal passere i N-lig retning i den W-lige side af &Oslash;sterrenden.</p>\n<p>Skibsfarten anmodes om at vise hensyn ved passage.</p>"},
    {"lang":"en",
    "subject":"Traffic separation scheme to be temporarily suspended.",
    "details":"<p><strong>On 3 March 2019</strong>,
    the traffic separation scheme TSS \"Between Korsoer and Sprogoe\" will be suspended for a time period of max. 3 hours.</p>\n<table class=\"position-table\">\n<tbody>\n<tr>\n<td class=\"pos-index\">1)</td>\n<td class=\"pos-col\">55&deg; 21.75'N - 011&deg; 02.13'E</td>\n</tr>\n<tr>\n<td class=\"pos-index\">2)</td>\n<td class=\"pos-col\">55&deg; 19.23'N - 011&deg; 02.19'E</td>\n</tr>\n</tbody>\n</table>\n<p><span>The exact time of the suspension will be announced by a navigational warning and by NAVTEX.</span></p>\n<p>The suspension is due to the fact that the vessel <span>&raquo;PIONEERING SPIRIT&laquo; (9HA4112) will pass in a northbound direction in the western side of the &Oslash;sterrenden.</span></p>\n<p>Mariners are requested to pass with caution.</p>"}],
    "hideSubject":true},
    {"indexNo":0,
    "type":"NOTE",
    "descs":[{"lang":"da",
    "details":"<p>Opdaterede oplysninger om suspenderingen kan f&aring;s ved henvendelse til Great Belt VTS p&aring; VHF kanal 11 og 74.&nbsp;</p>"},
    {"lang":"en",
    "details":"<p>Updated information of the suspension can be obtained by contacting Great Belt VTS on VHF channels 11 and 74.</p>"}]}],
    "descs":[{"lang":"da",
    "title":"Danmark. Storebælt. TSS \"Between Korsoer and Sprogoe\". Trafiksepareringssystem suspenderes midlertidigt.",
    "vicinity":"TSS \"Between Korsoer and Sprogoe\"",
    "publication":"Ships&rsquo; Routeing 2017 Edition",
    "source":"SFS 4. februar 2019"},
    {"lang":"en",
    "title":"Denmark. The Great Belt. TSS \"Between Korsoer and Sprogoe\". Traffic separation scheme to be temporarily suspended.",
    "vicinity":"TSS \"Between Korsoer and Sprogoe\"",
    "publication":"Ships&rsquo; Routeing 2017 Edition","source":"DMA 4 February 2019"}]}
    */