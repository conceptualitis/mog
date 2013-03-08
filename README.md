# WTF is Mog and why do I care?

Mog is an acronym for Markdown Object Generator -- but really the name's a shout-out to [my favorite Final Fantasy VI character](http://finalfantasy.wikia.com/wiki/Mog_(Final_Fantasy_VI\)).

It uses your HTML to generate surprisingly powerful JavaScript objects that emit events.

It's intended for people holding these two notions (or something similar?):

* You realize on some level that HTML is terrible for storing the properties and communicating the changes between pieces of what is essentially an expression of the model from your server.

* You've thought, said or shouted something like this:
  > "I know I'm doing something wrong here but I also know I don't want to create JavaScript models or use complex libraries/frameworks just to move some properties around in HTML!"

That you? Great.

## A bit more explanation

Say your app is full of little things like this:

```javascript
$("#select-id").on("change", function () {
    var newValue = $(this).val();
    $("#display-place").text(newValue);
    if (newValue == "red") {
        $("#some-other-thing").attr("disabled", true);
    }
});
```

Let's take a step back and think about what this code is really doing.

1. It is updating a property of the *conceptual* object, or model. It is *conceptual* because there is no code client-side to formalize it.
2. It is displaying this updated property somewhere in the HTML.
3. The updated property can change the *conceptual* object's state so that certain options are no longer available.

### Why this sucks

Collecting and disseminating the conceptual object's properties via HTML every time a property changes isn't ideal. You'll have to write new event listeners for each new input added, not to mention how complex determining the state of the conceptual object is going to become.

So let's get on with some Mog examples.

## Examples for Real Humans

All this shit was written to help me with an invitation system I was working on so that's the example we're doing. Deal with it.

Basically we'll be hooking functionality into changes made to the month, day and the number of people attending.

### Some HTML

```html
<!-- inputs -->
<form>
    Your name:
    <input type="text" name="invite[name]" value="Bob">
    
    <input type="hidden" name="invite[invites]" value="12">
    
    How many people are coming:
    <input type="text" name="invite[invitee_count]">
    
    When is this event:
    <select name="invite[month]">
        <option>Jan</option>
        <option>Feb</option>
        <option>Mar</option>
        <option>etc...</option>
    </select>
    
    <select name="invite[day]">
        <option>1</option>
        <option>2</option>
        <option>3</option>
        <option>etc...</option>
    </select>
</form>

<!-- outputs, with defaults -->
<div id="preview">
    <h1>Bob invites you!</h1>
    
    <p>
        You have 12 spaces left.
    </p>
    
    <p>
        Happening on Jan 1
    </p>
</div>
```

## Easy stuff first

Let's make the name show up in the preview.

First we'll need to add the approrpiate data attribute flags to get Mog working.

```html
    <input type="text" name="invite[name]" value="Bob" data-mog-model-invite="name" data-mog-model-role="input">
    ...
    <h1><span data-mog-model-invite="name" data-mog-model-role="output">Bob</span> invites you!</h1>
```

Then wherever you do your JavaScript:

```javascript
var invite = new Mog("invite");
```

And you're done. Changes made to the name input will automatically show up in the ```<h1>```

## The basics

The core idea here is that we flag pieces of HTML as either an input or an output. We also give it a property name in the ```data-mog-model-modelName="propertyName"``` format.

Mog goes through the HTML and generates properties from both inputs AND outputs. You can also create your own in the JavaScript but we'll get to that later.

## Let's get some properties interacting

So the first example was really easy. The next one will hopefully show you where Mog starts to shine.

Let's increment the number of spaces left at this party/dinner/whatever.

```html
    <input type="hidden" name="invite[invites]" value="12" data-mog-model-invite="invites" data-mog-model-role="input">
    
    How many people are coming:
    <input type="text" name="invite[invitee_count]" data-mog-model-invite="invitees" data-mog-model-role="input">
...
    <p>
        You have
        <span data-mog-model-invite="seats" data-mog-model-role="output">12</span>
        spaces left.
    </p>
```

So we have invites as the total number of available spaces, invitees as the number of people the user is bringing and seats is where we'll display all this.

Let's wire it up!

```javascript
// we listen for invitees to change on the Mog model
invite.on("mog.set.invite.invitees", function () {
    // we get the number of people invited
    var invitees = parseInt(this.get("invitees"), 10);
    var invites = parseInt(this.get("invites"), 10);
    
    // if we have fewer invitees than invites
    if (invitees <= invites) {
        var seats = invites - invitees;
        
        // set accepts objects filled with properties to set
        // Mog already knows about the seats output and will
        // update it automatically after this set is performed
        // also, if seats where to have an input associated
        // with it, it would be updated
        
        this.set({"seats", seats});
        
    } else {
        // since they've input more invitees than there are available
        // we could do something to set the state here and lock down the
        // form, like:
        
        this.set({"state": "overflow"});
        
        // then on a listener for mog.set.invite.state we could take the
        // appropriate action for the overflow state being reached, like locking
        // down the form
        
        // note that there is no state input or output in the HTML
    }
});
```
Hopefully you're starting to see how this can be powerful.

Now for the last example, dates.

```html
    When is this event:
    <select name="invite[month]" data-mog-model-invite="month" data-mog-model-role="input">
        <option>Jan</option>
        <option>Feb</option>
        <option>Mar</option>
        <option>etc...</option>
    </select>
    
    <select name="invite[day]" data-mog-model-invite="day" data-mog-model-role="input">
        <option>1</option>
        <option>2</option>
        <option>3</option>
        <option>etc...</option>
    </select>
...
    <p>
        Happening on <span data-mog-model-invite="date" data-mog-model-role="output">Jan 1</span>
    </p>
```

```javascript
var dateCallback = function () {
    var combined = this.get("month") + " " + this.get("day");
    this.set({"date": combined})
}

// two listeners, one callback
invite.on("mog.set.invite.month", dateCallback)
      .on("mog.set.invite.day", dateCallback);
```

Anyway that's it for 0.1.0 documentation. More to come.
