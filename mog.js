//  Mog.js 0.1.0
//  ==============================

//  Mog - Markup Object Generator
//  A core thing to extend and customize. The basic concept is that
//  it attempts to manage and be a representation of the data
//  contained in html, instead of a database

(function ( exports, document ) {

    "use strict";



    // The Core
    // -----------

    // Core is extended out into the Mog family of fun.

    var Core = function () {
        // pipeline will be used in the emitting of events
        this.pipeline = {};

        // this is where we keep all of our object's information
        this.data = {};

        this.build.apply( this, arguments );
        this.initialize.apply( this, arguments );
    };

    Core.prototype = {
        // initialize is defined when someone extends Core,
        // so it's customized code tailored to the extension
        initialize: function () {},

        // build is sort of the Other Initialize, for example, when
        // all Mogs absolutely need to do something upon construction that
        // can't be overwritten in initialize.
        build: function () {},

        // I'm lazy
        iterate: function( list, fn ) {
            for ( var item in list ) {
                if ( list.hasOwnProperty( item ) ) {
                    fn.call( this, list, item );
                }
            }
        },

        // loads up callbacks to run in event namespaces
        on: function( events, callBack ) {
            var cleanEvent;

            events.split( "," ).forEach( function( rawEvent ) {
                var cleanEvent = rawEvent.trim();
                this.pipeline[cleanEvent] = this.pipeline[cleanEvent] || [];
                this.pipeline[cleanEvent].push(callBack);
            }, this );

            return this; // chaining
        },

        // runs callbacks in event namesapces
        trigger: function( event, value ) {
            var i;
            if ( this.pipeline[event] && (i = this.pipeline[event].length) ) {
                while ( i-- ) {
                    this.pipeline[event][i].call( this, value );
                }
            }
        },

        get: function( property ) {
            return this.data[property];
        }
    };


    // extend
    // ---------

    // basically Backbone's extend, everyone gets it

    var extend = Core.extend = function( properties ) {
        var parent = this;

        var Class = function () {
            parent.apply( this, arguments );
        };

        Class.prototype = Object.create( parent.prototype );
        Class.prototype.iterate( properties, function( properties, property ) {
            Class.prototype[property] = properties[property];
        });

        Class.extend = parent.extend;

        return Class;
    };



    // Role
    // -------

    // Provides the core functionality for role elements

    var Role = Core.extend({
        // all roles need at least this stub for disseminate
        // because Mog expects roles to do something when
        // Mog tells them the property they're tied has changed
        disseminate: function () {}
    });




    // Mog
    // ------

    var Mog = Core.extend({

        build: function ( modelName ) {
            this.model = modelName;
            this.roles = Mog.roles;
        },

        factories: {},

        consume: function ( role ) {
            var elements = document.querySelectorAll( "*[data-mog-" + role + "^='" + this.model + "']" ),
                x = elements.length,
                attribute, property, newRole;

            this[role] = this[role] || {};

            while (x--) {
                attribute = elements[x].getAttribute("data-mog-" + role);
                property = attribute.slice( attribute.indexOf( "[" ) + 1, -1 );

                this[role][property] = this[role][property] || [];

                newRole = new this.factories[role]({
                    el: elements[x],
                    property: property,
                    parent: this
                });
                newRole.on("change", this.set.bind( this ) );
                this[role][property].push( newRole );
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
            this.iterate( this.input, function( inputs, property ) {
                inputs[property].forEach(function( input ) {
                    this.data[property] = input.value() || null;
                }, this);
            });
        },

        // takes [role][property] and moves its data[property] into it
        disseminate: function ( elements ) {
            elements.forEach(function( element, i ) {
                element.disseminate( this.get( element.get("property") ) );
            }, this );
        },

        // pushes data from mog to the inputs / outputs
        push: function( property ) {
            this.roles.forEach( function ( role ) {
                if ( property === undefined ) {
                    this.iterate( this[role], function( elements, property ) {
                        this.disseminate( this[role][property] );
                    });
                } else if ( this[role][property] ) {
                    this.disseminate( this[role][property] );
                }
            }, this );
        }
    });



    
    // addRole
    // ----------

    // adds a role like input or output to what Mog will expect to find in
    // the data-mog-roleName="model[property]" pattern, along with adding
    // functionality for it

    var addRole = Mog.addRole = function ( name, extensions ) {
        Mog.roles = Mog.roles || [];
        Mog.roles.push(name);
        Mog.prototype.factories[name] = Role.extend( extensions );
    };



    Mog.addRole( "input", {
        factories: {
            // each input type gets its own getValue and setValue function
            getValue: {
                checkbox: function() {
                    return ( this.el.checked ) ? this.el.value : null;
                },
                "select-one": function() {
                    return this.el[this.el.selectedIndex].text;
                },
                "select-multiple": function() {
                    var length = this.el.selectedOptions.length,
                        collection = [];

                    while ( length-- ) {
                        collection.push( this.el.selectedOptions[length].text );
                    }

                    return collection.join(", ");
                },
                generic: function() {
                    return this.el.value;
                }
            },

            setValue: {
                radio: function( value ) {
                    this.el.checked = ( value === this.value() ) ? true : false;
                },

                checkbox: function( value ) {
                    this.el.checked = ( value ) ? true : false;
                },

                generic: function( value ) {
                    if (this.el !== document.activeElement) {
                        this.el.value = value;
                    }
                }
            }
        },

        disseminate: function( newValue ) {
            this.value( newValue );
        },

        change: function() {
            var properties = {};
            properties[ this.get("property") ] = this.value();
            this.trigger("change", properties);
        },

        value: function ( value ) {
            return ( value !== undefined ) ? this.setValue( value ) : this.getValue();
        },

        initialize: function ( settings ) {
            this.el = settings.el;

            this.data = {
                role: "input",
                property: settings.property,
                type: this.el.type,
                checkable: ( this.el.type === "radio" || this.el.type === "checkbox" ) ? true : false
            };

            this.getValue = this.factories.getValue[ this.el.type ] || this.factories.getValue.generic;
            this.setValue = this.factories.setValue[ this.el.type ] || this.factories.setValue.generic;

            this.bind();
        },

        bind: function ( settings ) {
            this.el.addEventListener( "change", this.change.bind( this ) );
            this.el.addEventListener( "keyup", this.change.bind( this ) );
        }
    });



    Mog.addRole( "output", {
        disseminate: function( value ) {
            this.el.innerHTML = value;
        },

        initialize: function (settings) {
            this.el = settings.el;

            this.data = {
                role: "output",
                property: settings.property
            };
        }
    });



    Mog.addRole( "button", {} );



    exports.Mog = Mog;

})( this, document );
