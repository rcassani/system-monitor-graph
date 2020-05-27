const Desklet = imports.ui.desklet;
const Settings = imports.ui.settings;
const Mainloop = imports.mainloop;
const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const Cinnamon = imports.gi.Cinnamon;
const Gio = imports.gi.Gio;
const Cairo = imports.cairo;
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
        this.settings.bindProperty(Settings.BindingDirection.IN, "line-color", "line_color", this.on_setting_changed);
        // initialize desklet GUI
        this.setupUI();
    },

    setupUI: function(){
        // initialize this.canvas
        this.canvas = new Clutter.Actor();
        this.canvas.remove_all_children();
        this.text1 = new St.Label();
        this.text2 = new St.Label();
        this.canvas.add_actor(this.text1);
        this.canvas.add_actor(this.text2);
        this.setContent(this.canvas);

        // flag to indicate the first loop of the Desklet
        this.first_run = true;
        // update loop for Desklet
        this.update();
    },

    update: function() {
        // time settings for graph
        if (this.first_run){
            this.duration = 30;
            this.refresh_interval = 1;
            this.n_values = Math.floor(this.duration / this.refresh_interval)  + 1;
            this.values = new Array(this.n_values).fill(0.0);
        }

        // Desklet proportions
        let unit_size = 15;  // pixels
        var margin_up = 3 * unit_size;
        var graph_w = 20 * unit_size;
        var graph_h =  4 * unit_size;
        let desklet_w = graph_w + (2 * unit_size);
        let desklet_h = graph_h + (4 * unit_size);
        var v_midlines = 4;
        var h_midlines = 5;
        let text1_size = 5 * unit_size / 3;
        let text2_size = 4 * unit_size / 3;
        var radius = 2 * unit_size / 3;;
        var degrees = Math.PI / 180.0;

        let n_values = this.n_values;
        let values = this.values;
        let graph_step = graph_w / (n_values -1);

        var value = 0.0;
        var text1 = '';
        var text2 = '';
        var line_r;
        var line_g;
        var line_b;

        // current values
        switch (this.type) {
          case "cpu":
              // CPU usage https://rosettacode.org/wiki/Linux_CPU_utilization
              text1 = 'CPU';
              let cpu_values = this.get_cpu_times();
              let cpu_tot = cpu_values[0];
              let cpu_idl = cpu_values[1];

              if (this.first_run){
                  this.first_run = false;
                  this.cpu_tot = cpu_tot;
                  this.cpu_idl = cpu_idl;
              }
              else {
                  let cpu_use = 100 * (1 - (cpu_idl - this.cpu_idl) / (cpu_tot - this.cpu_tot));
                  this.cpu_tot = cpu_tot;
                  this.cpu_idl = cpu_idl;
                  value = cpu_use / 100;
                  text2 = Math.round(cpu_use).toString() + "%";
              }
              break;

          case "ram":
              value = 12;
              this.text1.set_text(type);
              this.text2.set_text(value.toString());
              global.log("update ram");
              break;
        }

        // concatenate new value
        values.push(value);
        values.shift();
        this.values = values;

        // line_color
        let line_colors = this.line_color.match(/\((.*?)\)/)[1].split(","); // get contents inside brackets: "rgb(...)"
        line_r = parseInt(line_colors[0])/255;
        line_g = parseInt(line_colors[1])/255;
        line_b = parseInt(line_colors[2])/255;

        let canvas = new Clutter.Canvas();
        canvas.set_size(desklet_w, desklet_h);
        canvas.connect('draw', function (canvas, ctx, desklet_w, desklet_h) {
            ctx.save();
            ctx.setOperator(Cairo.Operator.CLEAR);
            ctx.paint();
            ctx.restore();
            ctx.setOperator(Cairo.Operator.OVER);
            ctx.setLineWidth(2);

            // desklet background
            ctx.setSourceRGBA(0.2, 0.2, 0.2, 1);
            ctx.newSubPath();
            ctx.arc(desklet_w - radius, radius, radius, -90 * degrees, 0 * degrees);
            ctx.arc(desklet_w - radius, desklet_h - radius, radius, 0 * degrees, 90 * degrees);
            ctx.arc(radius, desklet_h - radius, radius, 90 * degrees, 180 * degrees);
            ctx.arc(radius, radius, radius, 180 * degrees, 270 * degrees);
            ctx.closePath();
            ctx.fill();

            // graph border
            ctx.setSourceRGBA(line_r, line_g, line_b, 1);
            ctx.rectangle(unit_size, margin_up, graph_w, graph_h);
            ctx.stroke();

            // graph V and H midlines
            ctx.setSourceRGBA(0.5, 0.5, 0.5, 1);
            ctx.setLineWidth(0.5);
            for (let i = 1; i<v_midlines; i++){
                ctx.moveTo((i * graph_w / v_midlines) + unit_size, margin_up);
                ctx.relLineTo(0, graph_h);
                ctx.stroke();
            }
            for (let i = 1; i<h_midlines; i++){
                ctx.moveTo(unit_size, margin_up + i * (graph_h / h_midlines));
                ctx.relLineTo(graph_w, 0);
                ctx.stroke();
            }

            // timeseries and area
            ctx.setLineWidth(2);
            ctx.setSourceRGBA(line_r, line_g, line_b, 1);
            ctx.moveTo(unit_size, margin_up + graph_h - (values[0] * graph_h));
            for (let i = 1; i<n_values; i++){
                ctx.lineTo(unit_size + (i * graph_step), margin_up + graph_h - (values[i] * graph_h));
            }
            ctx.strokePreserve();
            ctx.lineTo(unit_size + graph_w, margin_up + graph_h);
            ctx.lineTo(unit_size, margin_up + graph_h);
            ctx.closePath();
            ctx.setSourceRGBA(line_r, line_g, line_b, 0.2);
            ctx.fill();

            return false;
        });

        // text position and content
        this.text1.set_position(unit_size, 2 * unit_size / 3);
        this.text1.set_text(text1);
        this.text1.style = "font-size: " + text1_size + "px;";
        this.text2.set_position(5 * unit_size, unit_size);
        this.text2.set_text(text2);
        this.text2.style = "font-size: " + text2_size + "px;";

        // update canvas
        canvas.invalidate();
        this.canvas.set_content(canvas);
        this.canvas.set_size(desklet_w, desklet_h);
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
