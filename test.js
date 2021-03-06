
const _this = {};

const canvas = document.getElementsByTagName("canvas")[0];
const LNG = 122.4175, LAT = 37.655;
const radius = 7500.0;
let worldRectangle;
let positions = [[123.62,38.89,10000],[124.50,35.25,10000],[124.85,30.14,20000],[118.07,23.35,20000],
[115.34,20.4,20000],[110.35,16.35,20000],[110.33,13.36,10000],[110.33,11.37,10000],[107.33,8.9,10000],
[103.33,8.35,10000],[101.33,10.35,10000],[99.33,10.35,10000]]

let positions2 = [[129.62,38.89,10000],[130.50,35.25,10000],[131.85,30.14,20000],[132.07,23.35,20000],
[133.34,20.4,20000],[134.35,16.35,20000],[136.33,13.36,10000],[137.33,11.37,10000],[138.33,8.9,10000],
[139.33,8.35,10000],[140.33,10.35,10000],[141.33,10.35,10000]]
let viewer
function initCesium() {
    var token = '02a9d2a704f39cf2d5d7c6b668c51330';
    // 服务域名
    var tdtUrl = 'https://t0.tianditu.gov.cn/';
    // 服务负载子域
    var subdomains=['0','1','2','3','4','5','6','7'];
    viewer = _this.viewer  = new Cesium.Viewer('cesiumContainer',{
        shouldAnimate: true, // Enable animations
        imageryProvider : new Cesium.UrlTemplateImageryProvider({
            url: tdtUrl + 'DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + token,
            subdomains: subdomains,
            tilingScheme : new Cesium.WebMercatorTilingScheme(),
            maximumLevel : 18
        })
    });
    const scene = viewer.scene;
    viewer.camera.flyTo({
        destination : Cesium.Cartesian3.fromDegrees(125.33,30.35,5000000),
        orientation : {
            heading : Cesium.Math.toRadians(0.0),
            pitch : Cesium.Math.toRadians(-90.0),
        }
    });
    
    _this.base_point = cart2vec(Cesium.Cartesian3.fromDegrees(LNG, LAT, 50));
    _this.base_point_up = cart2vec(Cesium.Cartesian3.fromDegrees(LNG, LAT, 300));
    setShy()
    let water = applyWaterMaterial(scene);
    let cloud = LoadClouds(viewer);
    createAirLine()
    monitor(water,cloud)

}
function monitor(water,cloud){
  // 监控相机高度
  var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function(wheelment) {
      
      var height=viewer.camera.positionCartographic.height;
      console.log(_this.viewer.entities)
      if(height > 5000000){
        water.show = false
        cloud.show = true
      //   _this.viewer.entities.show = true
      }else{
        water.show = true
        cloud.show = false
      //   _this.viewer.entities.show = false
      }
  }, Cesium.ScreenSpaceEventType.WHEEL);
}
function createAirLine(){

    Cesium.Math.setRandomNumberSeed(3);
    //Set bounds of our simulation time
    const start = Cesium.JulianDate.fromDate(new Date(2015, 2, 25, 16));
    const stop = Cesium.JulianDate.addSeconds(
        start,
        48,
        new Cesium.JulianDate()
    );

    //Make sure viewer is at the desired time.
    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP; //Loop at the end
    viewer.clock.multiplier = 1;

    //Set timeline to simulation bounds
    viewer.timeline.zoomTo(start, stop);
    const position = computeCirclularFlight(start, positions);
    const position2 = computeCirclularFlight(start, positions2);
    //Actually create the entity
    const entity = viewer.entities.add({
      //Set the entity availability to the same interval as the simulation time.
      availability: new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: start,
          stop: stop,
        }),
      ]),
    
      //Use our computed positions
      position: position,
    
      //Automatically compute orientation based on position movement.
      orientation: new Cesium.VelocityOrientationProperty(position),
    
      //Load the Cesium plane model to represent the entity
      model: {
        uri: "./Cesium_Air.glb",
        minimumPixelSize: 48,
        maximumPixelSize: 48,
      },
    
      //Show the path as a pink line sampled in 1 second increments.
      path: {
        resolution: 1,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.1,
          color: Cesium.Color.YELLOW,
        }),
        width: 10,
      },
    });

    const entity2 = viewer.entities.add({
        //Set the entity availability to the same interval as the simulation time.
        availability: new Cesium.TimeIntervalCollection([
          new Cesium.TimeInterval({
            start: start,
            stop: stop,
          }),
        ]),
      
        //Use our computed positions
        position: position2,
      
        //Automatically compute orientation based on position movement.
        orientation: new Cesium.VelocityOrientationProperty(position2),
      
        //Load the Cesium plane model to represent the entity
        model: {
          uri: "./Cesium_Air.glb",
          minimumPixelSize: 48,
          maximumPixelSize: 48,
        },
      
        //Show the path as a pink line sampled in 1 second increments.
        path: {
          resolution: 1,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.1,
            color: Cesium.Color.YELLOW,
          }),
          width: 10,
        },
      });
}
//Generate a random circular pattern with varying heights.
function computeCirclularFlight(start, positions) {
  const property = new Cesium.SampledPositionProperty();
  for (let i = 0; i < 48; i+4) {
    const time = Cesium.JulianDate.addSeconds(
      start,
      i,
      new Cesium.JulianDate()
    );
    const position = Cesium.Cartesian3.fromDegrees(
        positions[i][0],
        positions[i][1],
        positions[i][2]
    );
    property.addSample(time, position);
  }
  return property;
}

 
const source = `
#define M_PI 3.1415926535897932384626433832795

uniform sampler2D image;
uniform float radians;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
  czm_material material = czm_getDefaultMaterial(materialInput);
  vec2 st = vec2(materialInput.st.x - 0.5, materialInput.st.y - 0.5);
  float alpha = 1.3 - st.y-st.x -0.5;
  float current_radians = atan(st.y, st.x);
  float radius = sqrt( st.x * st.x+st.y * st.y);
  if (radius < 0.5) {
    current_radians = current_radians - radians;
    st = vec2(cos(current_radians) * radius, sin(current_radians) * radius);
    st = vec2(st.x + 0.5, st.y + 0.5);
    vec4 colorImage = texture2D(image, st);
    material.diffuse = colorImage.rgb;
    material.alpha = colorImage.a * alpha;
  }else {
    material.alpha = 0.0;
  }
  return material;
}
`

const source2 = "czm_material czm_getMaterial(czm_materialInput materialInput)\n\
{\n\
     czm_material material = czm_getDefaultMaterial(materialInput);\n\
     vec2 st = materialInput.st;\n\
     vec4 colorImage = texture2D(image,   vec2(fract(st.s + radians),fract(st.t)));\n\
     material.alpha = colorImage.a * color.a  ;\n\
     material.diffuse =    color.rgb  ;\n\
     return material;\n\
 }";


const materialMain = new Cesium.Material({
    fabric: {
        type: 'Image',
        uniforms: {
            image: './map.png',
            radians: 0,
        },
        //shader
        source: source2
    }
});

function LoadClouds(viewer) {
    const worldRectangle1 = viewer.scene.primitives.add(new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.RectangleGeometry({
                rectangle: Cesium.Rectangle.fromDegrees(-180.0, -90.0, 180.0, 90.0),
                vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            })
        }),
        appearance: new Cesium.EllipsoidSurfaceAppearance({
            material: materialMain,
            aboveGround: true
        }),
        show: true
    }))
    var radians = 0
    viewer.scene.postRender.addEventListener(() => {
        radians += 0.0001;
        materialMain.uniforms.radians = radians;
    });
    return worldRectangle1
}
function applyWaterMaterial(scene) {
    worldRectangle = scene.primitives.add(
    new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
            geometry: new Cesium.RectangleGeometry({
                rectangle: Cesium.Rectangle.fromDegrees(
                    -180.0,
                    -90.0,
                    180.0,
                    90.0
                ),
                vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
            }),
        }),
        appearance: new Cesium.EllipsoidSurfaceAppearance({
            aboveGround: false,
        }),
        show: false,
    })
  );
  worldRectangle.appearance.material = new Cesium.Material({
        fabric: {
            type: "Water",
            uniforms: {
                specularMap: "./earthspec1k.jpg",
                normalMap: Cesium.buildModuleUrl(
                    "http://127.0.0.1:5556/waterNormals.jpg"
                ),
                frequency: 100000.0,
                animationSpeed: 0.1,
                amplitude: 12.0,
            },
        },
    });
    return worldRectangle
}
function setShy() {
    return
    const material = new Cesium.ImageMaterialProperty({
        image: "./map.png",
        repeat: Cesium.Cartesian2(1.0, 1.0),
        transparent: true,
        color: Cesium.Color.WHITE.withAlpha(0.5)

    })
    console.log('material: ', material);
    const customShader = new Cesium.CustomShader({
        uniforms: {
            u_colorIndex: {
                type: Cesium.UniformType.FLOAT,
                value: 1.0
            },
            u_normalMap: {
                type: Cesium.UniformType.SAMPLER_2D,
                value: new Cesium.TextureUniform({
                    url: "http://127.0.0.1:5555/map.png"
                })
            }
        },
        isTranslucent: true,
        varyings: {
            v_selectedColor: Cesium.VaryingType.VEC3
        },

        vertexShaderText: `
          void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
            console.log('7777777777777777777777777777',vsInput, vsOutput)
          }
          `,
        fragmentShaderText: `
          void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
          }
          `});


    const material2 = new Cesium.Material({
        fabric: {
            type: 'Image',
            uniforms: {
                image: './map.png',
                radians: 0,
            },
            //shader
            source: `
              #define M_PI 3.1415926535897932384626433832795

              uniform sampler2D image;
              uniform float radians;

              czm_material czm_getMaterial(czm_materialInput materialInput)
              {
                czm_material material = czm_getDefaultMaterial(materialInput);
                vec2 st = vec2(materialInput.st.x - 0.5, materialInput.st.y - 0.5);
                float alpha = 1.3 - st.x - 0.5;
                float current_radians = atan(st.y, st.x);
                float radius = sqrt(st.x * st.x + st.y * st.y);
                if (radius < 0.50) {
                  current_radians = current_radians - radians;
                  st = vec2(cos(current_radians) * radius, sin(current_radians) * radius);
                  st = vec2(st.x + 0.5, st.y + 0.5);
                  vec4 colorImage = texture2D(image, st);
                  material.diffuse = colorImage.rgb;
                  material.alpha = 0.1;
                } else {
                  material.alpha = 0.1;
                }

                return material;
              }
              `
        }
    })
    console.log('material2: ', material2);

    const redSphere = _this.viewer.entities.add({
        name: "Red sphere with black outline",
        position: new Cesium.Cartesian3(),
        ellipsoid: {
            radii: new Cesium.Cartesian3(radius, radius, radius),
            material: material

        }
    });
    redSphere.material = materialMain
}
function initBabylon() {
    const engine = new BABYLON.Engine(canvas);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = BABYLON.Color4(0, 0, 0, 0);

    const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);

    _this.root_node = new BABYLON.TransformNode("BaseNode", scene);
    _this.root_node.lookAt(_this.base_point_up.subtract(_this.base_point));
    _this.root_node.addRotation(Math.PI / 2, 0, 0);

    const box = BABYLON.MeshBuilder.CreateBox("box", { size: 10 }, scene);
    const material = new BABYLON.StandardMaterial("Material", scene);
    material.emissiveColor = new BABYLON.Color3(1, 0, 0);
    material.alpha = 0.5;
    box.material = material;
    box.parent = _this.root_node;

    const ground = BABYLON.MeshBuilder.CreateGround("ground", {
        width: 100,
        height: 100
    }, scene);
    ground.material = material;
    ground.parent = _this.root_node;

    _this.engine = engine;
    _this.scene = scene;
    _this.camera = camera;
}

function moveBabylonCamera() {
    let fov = Cesium.Math.toDegrees(_this.viewer.camera.frustum.fovy)
    _this.camera.fov = fov / 180 * Math.PI;

    let civm = _this.viewer.camera.inverseViewMatrix;
    let camera_matrix = BABYLON.Matrix.FromValues(
        civm[0], civm[1], civm[2], civm[3],
        civm[4], civm[5], civm[6], civm[7],
        civm[8], civm[9], civm[10], civm[11],
        civm[12], civm[13], civm[14], civm[15]
    );

    let scaling = BABYLON.Vector3.Zero(), rotation = BABYLON.Vector3.Zero(), transform = BABYLON.Vector3.Zero();
    camera_matrix.decompose(scaling, rotation, transform);
    let camera_pos = cart2vec(transform),
        camera_direction = cart2vec(_this.viewer.camera.direction),
        camera_up = cart2vec(_this.viewer.camera.up);

    let rotation_y = Math.atan(camera_direction.z / camera_direction.x);
    if (camera_direction.x < 0) rotation_y += Math.PI;
    rotation_y = Math.PI / 2 - rotation_y;
    let rotation_x = Math.asin(-camera_direction.y);
    let camera_up_before_rotatez = new BABYLON.Vector3(-Math.cos(rotation_y), 0, Math.sin(rotation_y));
    let rotation_z = Math.acos(camera_up.x * camera_up_before_rotatez.x + camera_up.y * camera_up_before_rotatez.y + camera_up.z * camera_up_before_rotatez.z);
    rotation_z = Math.PI / 2 - rotation_z;
    if (camera_up.y < 0) rotation_z = Math.PI - rotation_z;

    _this.camera.position.x = camera_pos.x - _this.base_point.x;
    _this.camera.position.y = camera_pos.y - _this.base_point.y;
    _this.camera.position.z = camera_pos.z - _this.base_point.z;
    _this.camera.rotation.x = rotation_x;
    _this.camera.rotation.y = rotation_y;
    _this.camera.rotation.z = rotation_z;
}

function cart2vec(cart) {
    return new BABYLON.Vector3(cart.x, cart.z, cart.y);
}
function getAdministrativeDivision() {
    var opts = {
        subdistrict: 0,   //获取边界不需要返回下级行政区
        extensions: 'all',  //返回行政区边界坐标组等具体信息
        level: 'province'  //查询行政级别为 市
    };
    let district = new AMap.DistrictSearch(opts),
    provinces = ["北京", "天津", "上海", "重庆", "新疆", "西藏", "宁夏", "内蒙古",
        "广西", "黑龙江", "吉林", "辽宁", "河北", "山东", "江苏", "安徽",
        "浙江", "福建", "广东", "海南", "云南", "贵州", "四川", "湖南",
        "湖北", "河南", "山西", "陕西", "甘肃", "青海", "江西", "台湾", "香港", "澳门"]
    provinces = ["中国"]
    for (let i = 0; i < provinces.length; i++) {

        district.search(provinces[i], function (status, result) {
            let lenght = result.districtList[0].boundaries.length
            console.log(status, result.districtList[0].boundaries[0])
            for (let i = 0; i < lenght; i++) {
                let positions = []
                result.districtList[0].boundaries[i].forEach(ele => {
                    positions.push(Cesium.Cartesian3.fromDegrees(ele.lng, ele.lat, 10000));
                })
                draw(positions)
            }

        });
    }
}

function draw(positions) {
    let entities = _this.viewer.entities;
    entities.add({
        polyline: {
            positions: positions,
            width: 5,
            material: new Cesium.PolylineGlowMaterialProperty({
                color: Cesium.Color.DEEPSKYBLUE,
                glowPower: 0.25,
            }),
        },
    });
    // _this.viewer.zoomTo(entities);
}

initCesium();
initBabylon();
getAdministrativeDivision();
_this.engine.runRenderLoop(() => {
    _this.viewer.render();
    moveBabylonCamera();
    _this.scene.render();
});