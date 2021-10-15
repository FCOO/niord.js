# niord.js
>


## Description
Read and adjust messages from [Nautical Information Directory](https://niord.dma.dk/#/) using [Niord Public API](http://docs.niord.org/public-api/api.html)

Create two global object constructor in namespace `window.Niord`:

    window.Niord.Messages(options)
    window.Niord.Publications()

**NOTE This is version 3 with a different interface that version 2.x**

## Installation
### bower
`bower install https://github.com/FCOO/niord.git --save`

## Demo
http://FCOO.github.io/niord.js/demo/ (see console)



## Usage
    window.Niord.load();
    var myNiordMessages = window.Niord.messages;

    //or create it individual
    //var myNiordMessages = new window.Niord.Messages();
    //myNiordMessages.load();

    myNiordMessages.getMessages(
        'FA FE', //domain. Can be "FA", "FE", "NW", NM" or combi of these
        function( list, domain ){
            //Do something with list
        },
        function(){
            //Error when loading the messages
        }
    );

    myNiordMessages.getMessage(
        'NM-885-17', //id or short-id
        function( message ){
            //Do something with message
        },
        function(){
            //Error when loading the message
        }
    );

    var myNiordPublications = window.Niord.publications({autoLoad: true});

    myNiordPublications.getPublications(
        function( list ){
            //Do something with list = []PUBLICATION
        },
        function(){
            //Error when loading the publications
        }
    );






### options
| Id | Type | Default | Description |
| :--: | :--: | :-----: | --- |
| `domains` | `[]STRING` | `["niord-nw", "niord-nm", "niord-fa", "niord-fe"]` | Only for `Niord.messages`. See below |

### Domains
There are four groups/type of messages:

- `"nw"` All Danish navigational warnings are produced in the "niord-nw" domain.
- `"nm"` All Danish Notices to Mariners are produced in the "niord-nm" domain.
- `"fa"` All Danish firing areas are defined as miscellaneous Notices to Mariners in the "niord-fa" domain.
- `"fe"` The actual firing exercises are maintained as local navigational warnings in the "niord-fe" domain.


### Methods
    window.Niord.load(options); //Create Niord.messages and Niord.publications and load the data

    window.Niord.messages
        .getMessages( domain, resolve, reject, promiseOptions );
        .getMessage( id, resolve, reject, promiseOptions );
        .load(promiseOptions);

    window.Niord.publications
        .getPublications(resolve, reject, promiseOptions);
        .load(promiseOptions);


**See source files for description of format**


## Copyright and License
This plugin is licensed under the [MIT license](https://github.com/FCOO/niord/LICENSE).

Copyright (c) 2018 [FCOO](https://github.com/FCOO)

## Contact information

Niels Holt nho@fcoo.dk
