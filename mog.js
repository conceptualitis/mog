//  Mog.js 0.1.0
//  ==============================

//  Mog - Markup Object Generator
//  A core thing to extend and customize. The basic concept is that
//  it attempts to manage and be a representation of the data
//  contained in html, instead of a database

(function ( window, document ) {
    "use strict";

    var Mog = function( modelName ) {
        this.roles = [
            "input",
            "output",
            "button"
        ];
        this.model = modelName;
        this.data = {};
        this.pipeline = {};
        this.initialize.call( this, arguments );
    };

    Mog.prototype = {
        initialize: function () {},

        on: function( eventList, callBack ) {
            var events = eventList.split( "," );

            events.forEach( function( untrimmedEvent ) {
                var trimmedEvent = untrimmedEvent.trim();
                this.pipeline[trimmedEvent] = this.pipeline[trimmedEvent] || [];
                this.pipeline[trimmedEvent].push(callBack);
            }, this );

            return this; // chaining
        },

        trigger: function( event, value ) {
            var i;
            if ( this.pipeline[event] && (i = this.pipeline[event].length) ) {
                while ( i-- ) {
                    this.pipeline[event][i].call( this, value );
                }
            }
        },

        consume: function ( role ) {
            var elements = document.querySelectorAll( "*[data-mog-" + role + "^='" + this.model + "']" ),
                x = elements.length,
                attribute,
                property;

            this[role + "s"] = this[role + "s"] || {};

            while (x--) {
                attribute = elements[x].getAttribute("data-mog-" + role);
                property = attribute.slice( attribute.indexOf( "[" ) + 1, -1 );

                this[role + "s"][property] = this[role + "s"][property] || [];
                this[role + "s"][property].push({
                    el: elements[x],
                    role: role,
                    property: property,
                    type: elements[x].type,
                    checkable: ( elements[x].type === "radio" || elements[x].type === "checkbox" ) ? true : false
                });

                elements[x].addEventListener( "change", this.change.bind( this, elements[x], property ) );
                elements[x].addEventListener( "keyup", this.change.bind( this, elements[x], property ) );
            }
        },

        sync: function () {
            this.roles.forEach( this.consume, this );
            this.pull();
        },

        get: function( property ) {
            return this.data[property];
        },

        set: function( properties, stopProp ) {
            this.iterate( properties, function( properties, property ) {
                this.data[property] = properties[property];
                this.push(property);

                // unless the event functionality is supressed, we
                // trigger the event for more complex interactions
                // and pass the new value
                if ( !stopProp ) {
                    this.trigger( "set." + property, properties[property] );
                }
            });
        },

        // pulls data from the inputs into mog
        pull: function () {
            this.iterate( this.inputs, function( inputs, property ) {
                this.data[property] = null;

                inputs[property].forEach(function( input ) {
                    if ( input.checkable && !input.el.checked ) {
                        return;
                    }
                    this.data[property] = input.el.value;
                }, this);
            });
        },

        // takes [role][property] and moves its data[property] into it
        disseminate: function ( elements ) {
            elements.forEach(function( element, i ) {
                switch ( element.role ) {
                    case "input":
                        if ( element.checkable ) {
                            if ( this.data[element.property] === element.el.value || (element.type === "checkbox" && this.data[element.property] === true) ) {
                                element.el.checked = true;
                            }  else {
                                element.el.checked = false;
                            }
                        } else if (element.el !== document.activeElement) {
                            element.el.value = this.data[element.property];
                        }
                        break;

                    case "output":
                        element.el.innerHTML = this.data[element.property];
                        break;

                    case "button":
                        break;
                }
            }, this );
        },

        // pushes data from mog to the inputs / outputs
        push: function( property ) {
            this.roles.forEach( function ( role ) {
                if ( property === undefined ) {
                    this.iterate( this[role + "s"], function( elements, property ) {
                        this.disseminate(this[role + "s"][property]);
                    });
                } else if ( this[role + "s"][property] ) {
                    this.disseminate(this[role + "s"][property]);
                }
            }, this );
        },

        getValue: function ( el ) {
            var length = 0,
                collection = [];

            if ( el.type === "checkbox" && !el.checked ) {
                return null;
            }

            if ( el.type === "select-one" ) {
                return el[el.selectedIndex].text;
            }

            if ( el.type === "select-multiple" ) {
                length = el.selectedOptions.length;

                while ( length-- ) {
                    collection.push( el.selectedOptions[length].text );
                }

                return collection.join(", ");
            }

            return el.value;
        },

        change: function( el, property ) {
            var properties = {};
            properties[property] = this.getValue( el );
            this.set( properties );
        }
    };

    var extend = function( properties ) {
        var parent = this;

        var MogClass = function () {
            parent.apply( this, arguments );
        };

        MogClass.prototype = Object.create( parent.prototype );

        parent.iterate( properties, function( properties, property ) {
            MogClass.prototype[property] = properties[property];
        });

        MogClass.extend = parent.extend;
        MogClass.iterate = parent.iterate;

        return MogClass;
    };

    var iterate = function( list, fn ) {
        for ( var item in list ) {
            if ( list.hasOwnProperty( item ) ) {
                fn.call( this, list, item );
            }
        }
    };

    Mog.iterate = Mog.prototype.iterate = iterate;
    Mog.extend = extend;

    window.Mog = Mog;

})( window, document );