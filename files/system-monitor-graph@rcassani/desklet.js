const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;

const St = imports.gi.St;

function MyDesklet(metadata, desklet_id) {
  this._init(metadata, desklet_id);
}

function main(metadata, desklet_id) {
  return new MyDesklet(metadata, desklet_id);
}

MyDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        // initialize settings
        this.settings = new Settings.DeskletSettings(this, this.metadata["uuid"], desklet_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "type", "type", this.on_setting_changed);

        // initialize desklet GUI
        this.setupUI();
    },

    setupUI: function(){
        // initialize size

        // create the clutter elements

        // type of system variable to graph
        var type = this.type;

        // creates container for one child
        this.window = new St.Bin();
        // creates a label to present text
        this.text = new St.Label();
        // adds label to container
        this.window.add_actor(this.text);
        // Sets the container as content actor of the desklet
        this.setContent(this.window);

        // set decoration settings

        // set initial values
        this.update();
    },

    update: function() {
        // console log
        global.log("update SMG");
        // do the graph
        var type = this.type;
        // add text to label
        this.text.set_text("Hello Desktop2 ".concat(type));
    }

};
