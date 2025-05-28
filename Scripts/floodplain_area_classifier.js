/**
 * Classificação de Áreas Inundadas com Imagens Ópticas e de Radar
 *
 * Este script classifica áreas de água, terra firme e zonas úmidas/inundáveis
 * em uma área de interesse (AOI) utilizando imagens dos satélites Sentinel-1 (radar)
 * e Sentinel-2 (óptico), com base em períodos de cheia e seca. Também são incluídos
 * dados de elevação (DEM) e altura do dossel florestal (GEDI).
 *
 * A classificação é feita com um classificador Random Forest treinado com amostras
 * de solo representando três classes: água (1), terra firme (0) e áreas úmidas (2).
 *
 * Funcionalidades do script:
 * - Geração de composições medianas para os períodos de cheia (jan-mar 2024) e seca (jul-set 2024).
 * - Cálculo do índice NDWI (Normalized Difference Water Index).
 * - Uso de dados auxiliares: elevação (DEM GLO30) e altura do dossel (GEDI).
 * - Treinamento de classificador Random Forest com dados do período de cheia.
 * - Classificação dos dois períodos com o mesmo classificador.
 * - Suavização das classes com filtro de moda focal.
 * - Vetorização das classes no período de cheia.
 * - Cálculo da área (em hectares) de cada classe, via raster e vetores.
 * - Visualização de todas as camadas no mapa do Earth Engine.
 *
 * Observações:
 * - O classificador é treinado apenas com dados do período de cheia.
 * - Para estimar a área sazonalmente inundada, recomenda-se comparar os mapas classificados
 *   de cheia e seca e identificar as mudanças na classe de água.
 */

// 1. Carregar polígono de interesse
var aoi = ee.FeatureCollection('users/burlamaquejess/cautario_buffered').geometry();

// 2. Funções de composição
function getRadarComposite(start, end) {
  return ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
    .select(['VH'])
    .median()
    .reproject({crs: 'EPSG:4326', scale: 60})
    .clip(aoi);
}

function getS2Composite(start, end) {
  var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15));

  print('Número de imagens Sentinel-2 entre ' + start + ' e ' + end, col.size());

  return col.median()
    .select(['B2', 'B3', 'B4', 'B8'])
    .clip(aoi);
}

// 3. Carregar DEM e Canopy Height (GEDI GLAD)
var dem = ee.ImageCollection('COPERNICUS/DEM/GLO30')
  .mosaic()
  .select('DEM')
  .clip(aoi);

var gedi = ee.ImageCollection('projects/sat-io/open-datasets/GLAD/GEDI_V27')
  .mosaic()
  .select('b1')  // usar a banda real existente
  .rename('canopy_height')
  .clip(aoi);


// 4. Composições e NDWI
var compositeCheiaRadar = getRadarComposite('2024-01-01', '2024-03-31');
var compositeCheiaOptico = getS2Composite('2024-01-01', '2024-03-31');
var ndwiCheia = compositeCheiaOptico.normalizedDifference(['B3', 'B8']).rename('NDWI');

var compositeCheia = compositeCheiaRadar
  .addBands(compositeCheiaOptico)
  .addBands(ndwiCheia)
  .addBands(dem.rename('elevation'))
  .addBands(gedi);

var compositeSecaRadar = getRadarComposite('2024-07-01', '2024-09-30');
var compositeSecaOptico = getS2Composite('2024-07-01', '2024-09-30');
var ndwiSeca = compositeSecaOptico.normalizedDifference(['B3', 'B8']).rename('NDWI');

var compositeSeca = compositeSecaRadar
  .addBands(compositeSecaOptico)
  .addBands(ndwiSeca)
  .addBands(dem.rename('elevation'))
  .addBands(gedi);

  // 5. Amostras de treino (classes 0, 1, 2)
var agua = geometry1.map(function(feat) { return feat.set('class', 1); });
var terra = geometry2.map(function(feat) { return feat.set('class', 0); });
var umida = geometry3.map(function(feat) { return feat.set('class', 2); });
var trainingSamples = agua.merge(terra).merge(umida);

// 6. Treinamento com todas as variáveis
var training = compositeCheia.sampleRegions({
  collection: trainingSamples,
  properties: ['class'],
  scale: 60
});

var classifier = ee.Classifier.smileRandomForest(50).train({
  features: training,
  classProperty: 'class',
  inputProperties: ['VH', 'B2', 'B3', 'B4', 'B8', 'NDWI', 'elevation', 'canopy_height']
});

// 7. Classificação cheia e seca
var classifiedCheia = compositeCheia.classify(classifier).clip(aoi);
var classifiedSeca = compositeSeca.classify(classifier).clip(aoi);

// 8. Suavização
var smoothedCheia = classifiedCheia.focal_mode(1.5, 'circle', 'pixels');
var smoothedSeca = classifiedSeca.focal_mode(1.5, 'circle', 'pixels');

// 9. Polígonos vetoriais (cheia)
var waterVector = smoothedCheia.eq(1).selfMask().reduceToVectors({geometry: aoi, scale: 60, geometryType: 'polygon'});
var landVector = smoothedCheia.eq(0).selfMask().reduceToVectors({geometry: aoi, scale: 60, geometryType: 'polygon'});
var humidVector = smoothedCheia.eq(2).selfMask().reduceToVectors({geometry: aoi, scale: 60, geometryType: 'polygon'});

// 10. Cálculo de áreas (cheia)
function calcularAreaRaster(img, nome) {
  var area_ha = img.multiply(ee.Image.pixelArea()).divide(10000)
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: 60, maxPixels: 1e13});
  print('Raster - ' + nome, area_ha);
}

function calcularAreaVetor(fc, nome) {
  var area_ha = fc.map(function(f) {
    return f.set('area_ha', f.geometry().area(ee.ErrorMargin(1)).divide(10000));
  });
  var soma = area_ha.aggregate_sum('area_ha');
  print('Vetor - ' + nome, soma);
}

calcularAreaRaster(smoothedCheia.eq(1), 'Agua');
calcularAreaRaster(smoothedCheia.eq(0), 'Terra Firme');
calcularAreaRaster(smoothedCheia.eq(2), 'Areas Umidas/Alagaveis');

calcularAreaVetor(waterVector, 'Agua');
calcularAreaVetor(landVector, 'Terra Firme');
calcularAreaVetor(humidVector, 'Areas Umidas/Alagaveis');

// 11. Visualização
Map.centerObject(aoi, 10);

Map.addLayer(dem, {min: 0, max: 300, palette: ['white', 'green', 'brown']}, 'DEM - GLO30', false);
Map.addLayer(gedi, {min: 0, max: 50, palette: ['white', 'lime', 'darkgreen']}, 'GEDI Canopy Height', false);
Map.addLayer(ndwiCheia, {min: -1, max: 1, palette: ['brown', 'white', 'blue']}, 'NDWI - Cheia', false);
Map.addLayer(ndwiSeca, {min: -1, max: 1, palette: ['brown', 'white', 'blue']}, 'NDWI - Seca', false);
Map.addLayer(compositeCheiaOptico.select(['B4','B3','B2']), {min: 0, max: 3000}, 'Sentinel-2 RGB - Cheia', false);
Map.addLayer(compositeSecaOptico.select(['B4','B3','B2']), {min: 0, max: 3000}, 'Sentinel-2 RGB - Seca', false);
Map.addLayer(compositeCheiaRadar.select('VH'), {min: -25, max: -5}, 'Radar VH - Cheia', false);
Map.addLayer(compositeSecaRadar.select('VH'), {min: -25, max: -5}, 'Radar VH - Seca', false);

Map.addLayer(smoothedCheia.updateMask(smoothedCheia.eq(1)), {palette: 'blue'}, 'Agua (Cheia - Suavizado)');
Map.addLayer(smoothedCheia.updateMask(smoothedCheia.eq(2)), {palette: 'purple'}, 'Umido (Cheia - Suavizado)');
Map.addLayer(smoothedCheia.updateMask(smoothedCheia.eq(0)), {palette: 'green'}, 'Terra (Cheia - Suavizado)');
Map.addLayer(smoothedSeca.updateMask(smoothedSeca.eq(1)), {palette: 'cyan'}, 'Agua (Seca - Suavizado)');
Map.addLayer(smoothedSeca.updateMask(smoothedSeca.eq(2)), {palette: 'magenta'}, 'Umido (Seca - Suavizado)');
Map.addLayer(smoothedSeca.updateMask(smoothedSeca.eq(0)), {palette: 'olive'}, 'Terra (Seca - Suavizado)');
Map.addLayer(waterVector, {color: 'blue'}, 'Poligono Agua');
Map.addLayer(landVector, {color: 'green'}, 'Poligono Terra');
Map.addLayer(humidVector, {color: 'purple'}, 'Poligono Areas Umidas');
