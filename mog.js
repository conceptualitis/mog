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

        sync: function () {
            var inputs = document.querySelectorAll( "*[data-mog-input^='" + this.model + "']" ),
                outputs = document.querySelectorAll( "*[data-mog-output^='" + this.model + "']" ),
                length = inputs.length,
                property = "";

            // inputs
            while ( length-- ) {
                property = this.getProperty( inputs[length].getAttribute( "data-mog-input" ) );

                this.inputs[property] = this.inputs[property] || [];
                this.inputs[property].push({
                    el: inputs[length],
                    type: inputs[length].type
                });

                // attach appropriate listeners
                if ( inputs[length].type === "select-one"  || inputs[length].type === "radio" ||  inputs[length].type === "checkbox" ) {
                    inputs[length].addEventListener( "change", this.change.bind( this, inputs[length], property ) );
                } else {
                    inputs[length].addEventListener( "keyup", this.change.bind( this, inputs[length], property ) );
                }
            }

            length = outputs.length;

            while ( length-- ) {
                property = this.getProperty( outputs[length].getAttribute( "data-mog-output" ) );

                this.outputs[property] = this.outputs[property] || [];
                this.outputs[property].push({
                    el: outputs[length],
                    type: outputs[length].type
                });
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
                    if ( (input.type === "radio" || input.type === "checkbox") && !input.el.checked ) {
                        return;
                    }
                    this.data[property] = input.el.value;
                }, this);
            });
        },

        pushInputs: function( property ) {
            this.inputs[property].forEach(function( input, i ) {
                if ( input.type === "checkbox" || input.type === "radio" ) {
                    if ( this.data[property] === input.el.value ) {
                        input.el.checked = true;
                    }  else {
                        input.el.checked = false;
                    }
                } else {
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