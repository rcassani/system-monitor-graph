const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const Cinnamon = imports.gi.Cinnamon;
const Gio = imports.gi.Gio;




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
        this.settings.bindProperty(Settings.BindingDirection.IN, "refresh-interval", "refresh_interval", this.on_setting_changed);


        // initialize desklet GUI
        this.setupUI();
    },

    setupUI: function(){
        // initialize size

        this.canvas = new Clutter.Actor();
        this.canvas.remove_all_children();
        this.text1 = new St.Label();
		    this.text2 = new St.Label();

        this.canvas.add_actor(this.text1);
        this.canvas.add_actor(this.text2);

        this.setContent(this.canvas);

        // set decoration settings

        // flag to indicate the first loop of the Desklet
        this.first_run = true;
        // update loop for Desklet
        this.update();
    },

    update: function() {
        // type of system variable to graph
        var type = this.type;
        var value = 0.0;
        // do the graph

        // text positions
        this.text1.set_position(null, null);
        this.text2.set_position(null, 50);

        // current values
        switch (type) {
          case "cpu":
              // CPU usage https://rosettacode.org/wiki/Linux_CPU_utilization
              var cpu_values = this.get_cpu_times();
              var cpu_tot = cpu_values[0];
              var cpu_idl = cpu_values[1];

              if (this.first_run){
                  this.first_run = false;
                  this.cpu_tot = cpu_tot;
                  this.cpu_idl = cpu_idl;
              }
              else {
                  var cpu_use = 100 * (1 - (cpu_idl - this.cpu_idl) / (cpu_tot - this.cpu_tot));
                  this.cpu_tot = cpu_tot;
                  this.cpu_idl = cpu_idl;
                  this.text1.set_text(type);
                  this.text2.set_text(Math.round(cpu_use).toString());
                  // update in graph
              }
              break;

          case "ram":
              value = 12;
              this.text1.set_text(type);
              this.text2.set_text(value.toString());
              global.log("update ram");
              break;
        }



        // call this.update() every in refresh_interval seconds
        this.timeout = Mainloop.timeout_add_seconds(this.refresh_interval, Lang.bind(this, this.update));
    },

    on_setting_changed: function() {
        // settings changed; instant refresh
        Mainloop.source_remove(this.timeout);
        this.update();
   },

    on_desklet_removed: function() {
        Mainloop.source_remove(this.timeout);
    },

    get_cpu_times: function(){
        // launching sequential processes
        // https://stackoverflow.com/questions/61147229/multiple-arguments-in-gio-subprocess
        let subprocess = new Gio.Subprocess({
            argv: ['/bin/sh', '-c', 'cat /proc/stat | grep cpu -w'],
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
          });
        subprocess.init(null);
        let [, out] = subprocess.communicate_utf8(null, null); // get full output from stdout
        let cpu_line = out.split(/\r?\n/)[0];   // get only one line
        let cpu_values = cpu_line.split(/\s+/); // split by space
        let cpu_idl = parseFloat(cpu_values[4]);
        let cpu_tot = 0;
        for (let i = 1; i<10; i++){
          cpu_tot += parseFloat(cpu_values[i])
        }
        return [cpu_tot, cpu_idl];
    }
};
