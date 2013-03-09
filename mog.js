/*
    Mog.js
    ==============================

    Mog - Markup Object Generator
    A core thing to extend and customize. The basic concept is that
    it attempts to manage and be a representation of the data
    contained in html, instead of a database communicating via
    XHR.

*/
(function (window, document) {
    "use strict";

    var Mog = function (modelName) {
        this.model = modelName;
        this.inputs = {};
        this.outputs = {};
        this.data = {};
        this.pipeline = {};
    };

    Mog.prototype = {
        iterate: function (list, fn) {
            for (var item in list) {
                if (list.hasOwnProperty(item)) {
                    fn.call(this, list, item);
                }
            }
        },

        getProperty: function (combo) {
            return combo.slice(combo.indexOf("[") + 1, -1);
        },

        on: function (eventBlob, callBack) {
            var events = eventBlob.split(",");

            events.forEach(function (untrimmedEvent) {
                var trimmedEvent = untrimmedEvent.trim();
                this.pipeline[trimmedEvent] = this.pipeline[trimmedEvent] || [];
                this.pipeline[trimmedEvent].push(callBack);
            }, this);

            return this; // chaining
        },

        trigger: function (event) {
            var mog = this;
            var i = 0;
            if (mog.pipeline[event] !== undefined && (i = mog.pipeline[event].length) > 0) {
                while (i--) {
                    mog.pipeline[event][i].call(mog);
                }
            }
        },

        sync: function () {
            var mog = this;

            var inputs = document.querySelectorAll("*[data-mog-input^='" + mog.model + "']");
            var outputs = document.querySelectorAll("*[data-mog-output^='" + mog.model + "']");
            var length = inputs.length;
            var property = "";

            // inputs
            while (length--) {
                property = mog.getProperty(inputs[length].getAttribute("data-mog-input"));

                mog.inputs[property] = mog.inputs[property] || [];
                mog.inputs[property].push({
                    el: inputs[length],
                    type: inputs[length].type
                });

                // attach appropriate listeners
                if ("select-one" === inputs[length].type) {
                    inputs[length].addEventListener("change", mog.change.bind(this, inputs[length]));
                } else if ("radio" === inputs[length].type || "checkbox" === inputs[length].type) {
                    inputs[length].addEventListener("change", mog.change.bind(this, inputs[length]));
                } else {
                    inputs[length].addEventListener("keyup", mog.change.bind(this, inputs[length]));
                }
            }

            length = outputs.length;

            while (length--) {
                property = mog.getProperty(outputs[length].getAttribute("data-mog-output"));

                mog.outputs[property] = mog.outputs[property] || [];
                mog.outputs[property].push(outputs[length]);
            }

            mog.pull();
        },

        get: function (property) {
            if (undefined !== property) {
                return this.data[property];
            }
            return undefined;
        },

        set: function (properties) {
            this.iterate(properties, function (properties, property) {
                this.data[property] = properties[property];

                if (this.inputs[property]) {
                    for (var t = 0; t < this.inputs[property].length; t += 1) {
                        if ("radio" !== this.inputs[property][t].type && "checkbox" !== this.inputs[property][t].type) {
                            this.inputs[property][t].value = properties[property];
                        }
                    }
                }
                if (this.outputs[property]) {
                    for (var i = 0; i < this.outputs[property].length; i += 1) {
                        this.outputs[property][i].innerHTML = properties[property];
                    }
                }

                // trigger the event for more complex interactions
                this.trigger(this.model + ".set." + property);
            });
        },

        // pulls data from the inputs into mog
        pull: function () {
            this.iterate(this.inputs, function (inputs, property) {
                this.data[property] = null;

                inputs[property].forEach(function (input) {
                    if ((input.type === "radio" || input.type === "checkbox") && !input.el.checked) {
                        return;
                    }
                    this.data[property] = input.el.value;
                }, this);
            });
        },

        // pushes data from mog to the inputs
        push: function () {
            this.iterate(this.inputs, function (inputs, property) {
                inputs[property].forEach(function (input, i) {
                    if (input.type === "checkbox" || input.type === "radio") {
                        if (this.data[property] === input.el.value) {
                            input.el.checked = true;
                        }  else {
                            input.el.checked = false;
                        }
                    } else {
                        input.el.value = this.data[property];
                    }
                }, this);
            });
        },

        change: function (el) {
            var properties = {};
            var property = this.getProperty(el.getAttribute("data-mog-input"));
            var type = el.type;

            if (type === "checkbox" && !el.checked) {
                properties[property] = null;
            } else if (type === "select-one") {
                properties[property] = el[el.selectedIndex].text;
            } else {
                properties[property] = el.value;
            }

            this.set(properties);
        }
    };

    window.Mog = Mog;

})(window, document);