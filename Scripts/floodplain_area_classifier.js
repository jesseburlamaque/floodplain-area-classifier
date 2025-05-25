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
