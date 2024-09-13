var cdnBase = "https://cdn.datatables.net";
var extensions = [
  { n: "autofill", v: "2.7.0" },
  { n: "buttons", v: "3.1.2" },
  { n: "fixedcolumns", v: "5.0.1" },
  { n: "fixedheader", v: "4.0.1" },
  { n: "keytable", v: "2.12.1" },
  { n: "responsive", v: "3.0.3" },
  { n: "rowgroup", v: "1.5.0" },
  { n: "rowreorder", v: "1.5.0" },
  { n: "scroller", v: "2.4.3" },
  { n: "searchbuilder", v: "1.8.0" },
  { n: "searchpanes", v: "2.3.2" },
  { n: "select", v: "2.0.5" },
  { n: "staterestore", v: "1.4.1" },
];

var styles = [
  { s: "bm", f: "bulma" },
  { s: "bs", f: "bootstrap" },
  { s: "bs4", f: "bootstrap4" },
  { s: "bs5", f: "bootstrap5" },
  { s: "dt", f: "dataTables" },
  { s: "ju", f: "jqueryui" },
  { s: "se", f: "semanticui" },
];

// Initial paths which aren't included in the automatic path setup
var paths = {
  "datatables.net": cdnBase + "/2.1.5/js/dataTables.min",
  "datatables.net-buttons-print":
    cdnBase + "/buttons/3.1.2/js/buttons.print.min",
  "datatables.net-buttons-html5":
    cdnBase + "/buttons/3.1.2/js/buttons.html5.min",
  "datatables.net-buttons-colvis":
    cdnBase + "/buttons/3.1.2/js/buttons.colVis.min",
  jquery: "https://code.jquery.com/jquery-3.6.0.min",
};

for (var i = 0; i < styles.length; i++) {
  paths["datatables.net-" + styles[i].s] =
    cdnBase + "/2.1.5/js/dataTables." + styles[i].f + ".min";
}

for (var i = 0; i < extensions.length; i++) {
  var e = extensions[i];

  paths["datatables.net-" + e.n] =
    cdnBase + "/" + e.n + "/" + e.v + "/js/dataTables." + e.n + ".min";

  for (var j = 0; j < styles.length; j++) {
    var s = styles[j];

    paths["datatables.net-" + e.n + "-" + s.s] =
      cdnBase + "/" + e.n + "/" + e.v + "/js/" + e.n + "." + s.f + ".min";
  }
}

paths["papaparse"] =
  "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min";

require.config({
  paths,
});

require.undef("heatmap_view_widget");

define("heatmap_view_widget", [
  "@jupyter-widgets/base",
  "datatables.net",
  "datatables.net-dt",
  "datatables.net-buttons",
  "papaparse",
], function (widgets, _, _, _, PapaParse) {
  let selectedGeneIds = [];
  let table = null;
  let searchColumnIndex = 0;
  function selectedGeneIdsChanged() {
    let newSelection = this.model.get("value");
    if (newSelection === undefined) {
      return;
    }
    selectedGeneIds = newSelection;

    if (table) {
      if (selectedGeneIds.length == 0) {
        table.columns(searchColumnIndex).search("").draw();
      } else {
        table
          .columns(searchColumnIndex)
          .search((data) => {
            return selectedGeneIds
              .map((x) => x.toString() == data)
              .some((x) => x);
          })
          .draw();
      }
    }
  }

  let HeatmapView = widgets.DOMWidgetView.extend({
    createDiv: function () {
      var divstyle = $("<table id='heatmap-div' class='row-border nowrap'>");
      return divstyle;
    },

    createHeatmap: function () {
      // Show loading spinner
      this.$el.html(
        this.$el.html() + "<div class='loader-text'>Loading...</div>"
      );
      this.model.on("change:value", selectedGeneIdsChanged, this);
      setTimeout(() => {
        let expression_data = PapaParse.parse(
          this.model.get("expression_data"),
          {
            skipEmptyLines: true,
          }
        ).data;
        let headers = expression_data[0];
        expression_data = expression_data.slice(1);
        let filter_key = this.model.get("filter_key");
        let expressionColumnsIndex =
          parseInt(this.model.get("expression_columns_index")) || 4;
        maxExpressionValue = 0;
        for (let row of expression_data) {
          for (let i = expressionColumnsIndex; i < row.length; i++) {
            let val = parseFloat(row[i]);
            if (Number.isNaN(val)) continue;
            row[i] = val;
            maxExpressionValue = Math.max(maxExpressionValue, val);
          }
        }
        let targets = Array.from(
          {
            length: headers.length - expressionColumnsIndex,
          },
          (_, i) => i + expressionColumnsIndex
        );
        searchColumnIndex = headers.indexOf(filter_key);
        if (searchColumnIndex == -1) searchColumnIndex = 0;
        const highlightColor = [131, 146, 219];
        const defaultColor = [250, 250, 255];
        table = $("#heatmap-div").DataTable({
          data: expression_data,
          columns: headers.map((x) => ({ title: x })),
          columnDefs: [
            {
              targets,
              createdCell: function (td, cellData, _, _, _) {
                if (Number.isFinite(cellData)) {
                  let strength = cellData / maxExpressionValue;
                  let color = highlightColor
                    .map(
                      (x, i) => x * strength + defaultColor[i] * (1 - strength)
                    )
                    .join(",");
                  $(td).css("background-color", `rgb(${color})`);
                }
              },
            },
          ],
        });
        // Hide loading spinner
        $(this.el).find(".loader-text").remove();
      }, 10);
    },

    render: function () {
      // div要素を追加
      this.$el.append(this.createDiv());
      let view = this;
      setTimeout(() => view.createHeatmap(), 500);
    },
  });

  return {
    HeatmapView,
  };
});
