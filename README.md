# niord.js
>


## Description
Read and adjust messages from [Nautical Information Directory](https://niord.dma.dk/#/) using [Niord Public API](http://docs.niord.org/public-api/api.html)

Create two global objects in namespace `window.Niord`:

    window.Niord.messages
    window.Niord.publications



## Installation
### bower
`bower install https://github.com/FCOO/niord.git --save`

## Demo
http://FCOO.github.io/niord.js/demo/ (see console)

## Usage

    window.Niord.getMessages(   //OR window.Niord.messages.getMessages( 
        'FA FE', //domain. Can be "FA", "FE", "NW", NM" or combi of these 
        function( list, domain ){
            //Do something with list
        },
        function(){
            //Error when loading the messages
        }
    );

    window.Niord.getMessage(   //OR window.Niord.messages.getMessage( 
        'NM-885-17', //id or short-id
        function( message ){
            //Do something with message
        },
        function(){
            //Error when loading the messages
        }
    );

    window.Niord.getPublications(  //OR window.Niord.publications.getPublications
        function( list ){
            //Do something with list
        },
        function(){
            //Error when loading the publications
        }
    );

**See source files for description of format**


## Copyright and License
This plugin is licensed under the [MIT license](https://github.com/FCOO/niord/LICENSE).

Copyright (c) 2018 [FCOO](https://github.com/FCOO)

## Contact information

Niels Holt nho@fcoo.dk
