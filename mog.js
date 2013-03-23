//  Mog.js 0.1.0
//  ==============================

//  Mog - Markup Object Generator
//  A core thing to extend and customize. The basic concept is that
//  it attempts to manage and be a representation of the data
//  contained in html, instead of a database

(function ( window, document ) {
    "use strict";

    var Mog = function( modelName ) {
        this.model = modelName;
        this.inputs = {};
        this.outputs = {};
        this.data = {};
        this.pipeline = {};
        this.initialize.call( this );
    };

    Mog.prototype = {
        initialize: function () {},

        getInfo: function( el ) {
            var attribute,
                role;

            role = el.getAttribute( "data-mog-input" ) ? "input" : "output";
            attribute = el.getAttribute( "data-mog-" + role );

            return {
                role: role,
                group: role + "s",
                property: attribute.slice( attribute.indexOf( "[" ) + 1, -1 )
            };
        },

        getProperty: function( combo ) {
            return combo.slice( combo.indexOf( "[" ) + 1, -1 );
        },

        on: function( eventList, callBack ) {
            var events = eventList.split( "," );

            events.forEach( function( untrimmedEvent ) {
                var trimmedEvent = untrimmedEvent.trim();
                this.pipeline[trimmedEvent] = this.pipeline[trimmedEvent] || [];
                this.pipeline[trimmedEvent].push(callBack);
            }, this );

            return this; // chaining
        },

        trigger: function( event ) {
            var i;
            if ( this.pipeline[event] && (i = this.pipeline[event].length) ) {
                while ( i-- ) {
                    this.pipeline[event][i].call( this );
                }
            }
        },

        addElement: function( role, el, property ) {
            this[role][property] = this[role][property] || [];
            this[role][property].push({
                el: el,
                type: el.type,
                checkable: ( el.type === "radio" || el.type === "checkbox" ) ? true : false
            });
        },

        sync: function () {
            var all = document.querySelectorAll( "*[data-mog-input^='" + this.model + "'], *[data-mog-output^='" + this.model + "']" ),
                i = all.length,
                info;

            while ( i-- ) {
                info = this.getInfo( all[i] );

                this.addElement( info.group, all[i], info.property);

                if ( info.role === "input" ) {
                    // attach appropriate listeners
                    if ( all[i].type === "select-one" || all[i].type === "radio" ||  all[i].type === "checkbox" ) {
                        all[i].addEventListener( "change", this.change.bind( this, all[i], info.property ) );
                    } else {
                        all[i].addEventListener( "keyup", this.change.bind( this, all[i], info.property ) );
                    }
                }
            }

            this.pull();
        },

        get: function( property ) {
            return this.data[property];
        },

        set: function( properties ) {
            var pushProps = [];

            this.iterate( properties, function( properties, property ) {
                this.data[property] = properties[property];
                pushProps.push(property);

                // trigger the event for more complex interactions
                this.trigger( this.model + ".set." + property );
            });

            this.push( pushProps );
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

        pushInputs: function( property ) {
            this.inputs[property].forEach(function( input, i ) {
                if ( input.checkable ) {
                    if ( this.data[property] === input.el.value ) {
                        input.el.checked = true;
                    }  else {
                        input.el.checked = false;
                    }
                } else if (input.el !== document.activeElement) {
                    input.el.value = this.data[property];
                }
            }, this );
        },

        pushOutputs: function( property ) {
            this.outputs[property].forEach(function( output, i ) {
                output.el.innerHTML = this.data[property];
            }, this );
        },

        // pushes data from mog to the inputs / outputs
        push: function( pushProps ) {
            if ( pushProps ) {
                pushProps.forEach(function ( property ) {
                    if ( this.inputs[property] ) {
                        this.pushInputs(property);
                    }
                    if ( this.outputs[property] ) {
                        this.pushOutputs( property );
                    }
                }, this );
            } else {
                this.iterate( this.inputs, function( inputs, property ) {
                    this.pushInputs( property );
                });
                this.iterate( this.outputs, function( outputs, property ) {
                    this.pushOutputs( property );
                });
            }
        },

        change: function( el, property ) {
            var properties = {};

            if ( el.type === "checkbox" && !el.checked ) {
                properties[property] = null;
            } else if ( el.type === "select-one" ) {
                properties[property] = el[el.selectedIndex].text;
            } else {
                properties[property] = el.value;
            }

            this.set( properties );
        }
    };

    var extend = function( properties ) {
        var parent = this;

        var MogClass = function( modelName ) {
            parent.call( this, modelName );
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