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

            for (var thing = 0; thing < things.length; thing++) {
                var name = things[thing].getAttribute("data-mog-model-" + mog.model);
                var role = things[thing].getAttribute("data-mog-model-role");
                var nodeName = things[thing].nodeName.toLowerCase();

                if ("input" === role) {
                    // need to filter what data is absorbed here in the event of an unchecked checkbox
                    if("checkbox" === things[thing].type) {
                        mog.data[name] = (things[thing].checked) ? things[thing].value : null;
                    } else {
                        mog.data[name] = things[thing].value;
                    }
                    // mog.inputs[name] = things[thing];
                    mog.inputs[name] = mog.inputs[name] || [];
                    mog.inputs[name].push(things[thing]);

                    if ("select" === nodeName) {
                        things[thing].addEventListener("change", mog.selectChange.bind(this, things[thing]));
                    } else if ("radio" === things[thing].type || "checkbox" === things[thing].type) {
                        things[thing].addEventListener("change", mog.inputChange.bind(this, things[thing]));
                    }else {
                        things[thing].addEventListener("keyup", mog.inputChange.bind(this, things[thing]));
                    }
                }
                if ("output" === role) {
                    mog.outputs[name] = mog.outputs[name] || [];
                    mog.outputs[name].push(things[thing]);
                }
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
                properties[el.getAttribute("data-mog-model-" + this.model)] = null;
            } else {
                properties[el.getAttribute("data-mog-model-" + this.model)] = el.value;
            }

            this.set(properties);
        },
        
        selectChange: function (el) {
            var properties = {};
            properties[el.getAttribute("data-mog-model-" + this.model)] = el[el.selectedIndex].text;

            this.set(properties);
        }
    };

    window.Mog = Mog;

})(window, document);