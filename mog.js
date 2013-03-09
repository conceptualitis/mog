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

        on: function (event, callBack) {
            var mog = this;

            if (mog.pipeline[event] === undefined) {
                mog.pipeline[event] = [];
            }

            mog.pipeline[event].push(callBack);

            return mog; // chaining
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
            console.log("Mog.sync");

            var mog = this;

            var things = document.querySelectorAll("[data-mog-model-" + mog.model + "]");

            var inputs = document.querySelectorAll("*[data-mog-input^='" + mog.model + "']");
            var outputs = document.querySelectorAll("*[data-mog-output^='" + mog.model + "']");
            var length = inputs.length;
            var property = "";

            // inputs
            while (length--) {
                property = mog.getProperty(inputs[length].getAttribute("data-mog-input"));

                mog.inputs[property] = mog.inputs[property] || [];
                mog.inputs[property].push(inputs[length]);

                // need to filter what data is absorbed here in the event of an unchecked checkbox
                // to-do: probably best to use pull() here for this shit
                if("checkbox" === inputs[length].type) {
                    mog.data[property] = (inputs[length].checked) ? inputs[length].value : null;
                } else {
                    mog.data[property] = inputs[length].value;
                }

                // attach appropriate listeners
                if ("select" === inputs[length].nodeName.toLowerCase()) {
                    inputs[length].addEventListener("change", mog.selectChange.bind(this, inputs[length]));
                } else if ("radio" === inputs[length].type || "checkbox" === inputs[length].type) {
                    inputs[length].addEventListener("change", mog.inputChange.bind(this, inputs[length]));
                }else {
                    inputs[length].addEventListener("keyup", mog.inputChange.bind(this, inputs[length]));
                }
            }

            length = outputs.length;

            while (length--) {
                property = mog.getProperty(outputs[length].getAttribute("data-mog-output"));

                mog.outputs[property] = mog.outputs[property] || [];
                mog.outputs[property].push(outputs[length]);
            }
        },

        get: function (property) {
            console.log("Mog: " + this.model + ".get");

            if (undefined !== property) {
                console.log(property);
                console.log(this.data);
                return this.data[property];
            }
            return undefined;
        },

        set: function (properties) {
            console.log("Mog: " + this.model + ".set");

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

                // trigger the hook for more complex interactions
                console.log("mog.set." + this.model + "." + property);
                this.trigger("mog.set." + this.model + "." + property);
            });
        },

        pull: function () {
            console.log("Mog.pull");

            var properties = {};

            this.iterate(this.inputs, function (inputs, element) {
                properties[element] = inputs[element].value;
            });

            this.set(properties);
        },

        push: function () {
            console.log("Mog.push");

            var properties = {};

            for (var element in this.inputs) {
                if (this.inputs.hasOwnProperty(element)) {
                    properties[element] = this.data[element];
                }
            }

            this.set(properties);
        },

        inputChange: function (el) {
            var properties = {};

            if (el.type === "checkbox" && !el.checked) {
                properties[this.getProperty(el.getAttribute("data-mog-input"))] = null;
            } else {
                properties[this.getProperty(el.getAttribute("data-mog-input"))] = el.value;
            }

            this.set(properties);
        },
        
        selectChange: function (el) {
            var properties = {};
            properties[this.getProperty(el.getAttribute("data-mog-input"))] = el[el.selectedIndex].text;

            this.set(properties);
        }
    };

    window.Mog = Mog;

})(window, document);