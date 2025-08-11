import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import LayerLayer from "ol/layer/Layer";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat, toLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import readGeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import { GeoJsonLayer } from "@deck.gl/layers";
import { ArcLayer } from "@deck.gl/layers";
import { Deck } from "@deck.gl/core";
import { EditableGeoJsonLayer } from "@nebula.gl/layers";
import { Toolbox } from "@nebula.gl/editor";
import { DrawPolygonMode } from "@nebula.gl/edit-modes";

export default () => {
  const mapRef = useRef();
  const [features, setFeatures] = React.useState({
    type: "FeatureCollection",
    features: [],
  });
  const [mode, setMode] = React.useState(() => DrawPolygonMode);
  const [modeConfig, setModeConfig] = React.useState({});
  const [selectedFeatureIndexes] = React.useState([]);

  useEffect(() => {
    // DeckGL layers
    const AIR_PORTS =
      "https://gist.githubusercontent.com/klokan/2decd22216fa98ab1a259119084866be/raw/dad9197761541083371fb41038394a8e5e21264a/ne_10m_airports.geojson";

    const layers = [
      new EditableGeoJsonLayer({
        mode,
        modeConfig,
        selectedFeatureIndexes,
        onEdit: ({ updatedData }) => {
          setFeatures(updatedData);
        },
      }),
      new GeoJsonLayer({
        id: "airports",
        data: AIR_PORTS,
        // Styles
        filled: true,
        pointRadiusMinPixels: 2,
        pointRadiusScale: 2000,
        getPointRadius: (f) => 11 - f.properties.scalerank,
        getFillColor: [200, 0, 80, 180],
        // Interactive props
        pickable: true,
        autoHighlight: true,
        onClick: (info) =>
          // eslint-disable-next-line
          info.object &&
          alert(
            `${info.object.properties.name} (${info.object.properties.abbrev})`
          ),
      }),
      new ArcLayer({
        id: "arcs",
        data: AIR_PORTS,
        dataTransform: (d) =>
          d.features.filter((f) => f.properties.scalerank < 4),
        // Styles
        getSourcePosition: (f) => [-0.4531566, 51.4709959], // London
        getTargetPosition: (f) => f.geometry.coordinates,
        getSourceColor: [0, 128, 200],
        getTargetColor: [200, 0, 80],
        getWidth: 1,
      }),
    ];

    // Create deck instance
    const INITIAL_VIEW_STATE = {
      latitude: 0,
      longitude: 0,
      zoom: 1,
    };

    const deckspace = new Deck({
      initialViewState: INITIAL_VIEW_STATE,
      parent: mapRef.current,
      controller: false,
      style: {
        pointerEvents: "none",
        "z-index": 1,
      },
      layers,
    });

    // Sync deck view with OL view
    const deckLayer = new LayerLayer({
      render: function ({ size, viewState }) {
        const [width, height] = size;
        const [longitude, latitude] = toLonLat(viewState.center);
        const zoom = viewState.zoom - 1;
        const bearing = (-viewState.rotation * 180) / Math.PI;
        const deckViewState = {
          bearing,
          longitude,
          latitude,
          zoom,
        };
        deckspace.setProps({ width, height, viewState: deckViewState });
        deckspace.redraw();
      },
    });

    const initStyle = new Style({
      fill: new Fill({
        color: "#eeeeee",
      }),
    });
    // create and add vector source layer
    const initalFeaturesLayer = new VectorLayer({
      source: new VectorSource({
        url: "https://openlayers.org/data/vector/ecoregions.json",
        format: new readGeoJSON(),
      }),
      style: function (feature) {
        const color = feature.get("COLOR") || "#eeeeee";
        initStyle.getFill().setColor(color);
        return initStyle;
      },
    });

    new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        initalFeaturesLayer,
        deckLayer,
      ],
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 1,
      }),
    });
  });

  const geoJsonn = {
    type: "FeatureCollection",
    features: [],
  };

  return (
    <>
      <div id="map" className="map" ref={mapRef} />
      <Toolbox
        mode={mode}
        onSetMode={setMode}
        modeConfig={modeConfig}
        onSetModeConfig={setModeConfig}
        geoJson={features}
        onSetGeoJson={setFeatures}
      />
    </>
  );
};
