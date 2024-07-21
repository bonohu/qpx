require.config({
  paths: {
    svg: "https://cdn.jsdelivr.net/npm/svgjs@2.6.2/dist/svg.min", // Needed for svg
    ApexCharts:
      "https://cdn.jsdelivr.net/npm/apexcharts@3.50.0/dist/apexcharts.min",
  },
});

require.undef("heatmap_view_widget");

define("heatmap_view_widget", [
  "@jupyter-widgets/base",
  "svg",
  "ApexCharts",
], function (widgets, svg, ApexCharts) {
  let HeatmapView = widgets.DOMWidgetView.extend({
    createDiv: function () {
      var divstyle = $("<div id='heatmap-div'>");
      return divstyle;
    },

    createHeatmap: function () {
      // this.model.on("change:value", selectedGeneIdsChanged, this);
      let expression_data = JSON.parse(this.model.get("expression_data"));

      let options = {
        chart: {
          height: 350,
          type: "heatmap",
        },
        plotOptions: {
          heatmap: {
            shadeIntensity: 1,
          },
        },
        colors: Array(expression_data.length).fill("#008FFB"),
        dataLabels: {
          enabled: false,
        },
        series: expression_data.map((d, i) => {
          return {
            name: d.name,
            data: Object.keys(d.expression_values).map((key) => {
              return {
                x: key,
                y: d.expression_values[key],
              };
            }),
          };
        }),
      };

      console.log(ApexCharts);
      console.log({ options });
      console.log(document.querySelector("#heatmap-div"));
      let chart = new ApexCharts(
        document.querySelector("#heatmap-div"),
        options
      );
      chart.render();
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
