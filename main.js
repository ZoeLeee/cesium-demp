const _this = {};

const canvas = document.getElementsByTagName("canvas")[0];
const LNG = -122.4175, LAT = 37.655;

function initCesium() {
    let worldRectangle;
    const viewer = new Cesium.Viewer('cesiumContainer');
    const scene = viewer.scene;
    viewer.camera.flyTo({
        destination : Cesium.Cartesian3.fromDegrees(LNG, LAT, 300),
        orientation : {
            heading : Cesium.Math.toRadians(0.0),
            pitch : Cesium.Math.toRadians(-90.0),
        }
    });

    _this.viewer = viewer;
    _this.base_point = cart2vec(Cesium.Cartesian3.fromDegrees(LNG, LAT, 50));
    _this.base_point_up = cart2vec(Cesium.Cartesian3.fromDegrees(LNG, LAT, 300));
    setShy()
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
          show: true,
        })
      );
    applyWaterMaterial(worldRectangle, scene);
}
function applyWaterMaterial(primitive, scene) {
  
    primitive.appearance.material = new Cesium.Material({
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
}
function setShy(){
    const radius=7500000.0;
    const material = new Cesium.ImageMaterialProperty({
        image:"./map.png",
        repeat: Cesium.Cartesian2(1.0, 1.0),
        transparent:true,
        color:Cesium.Color.WHITE.withAlpha(0.5)
        
    })
    const redSphere = _this.viewer.entities.add({
        name: "Red sphere with black outline",
        position:new Cesium.Cartesian3(),
        ellipsoid: {
            radii: new Cesium.Cartesian3(radius, radius, radius),
            material: material,
        },
    });
}
function initBabylon() {
    const engine = new BABYLON.Engine(canvas);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = BABYLON.Color4(0, 0, 0, 0);

    const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);

    _this.root_node = new BABYLON.TransformNode("BaseNode", scene);
    _this.root_node.lookAt(_this.base_point_up.subtract(_this.base_point));
    _this.root_node.addRotation(Math.PI / 2, 0, 0);

    const box = BABYLON.MeshBuilder.CreateBox("box", {size: 10}, scene);
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
        civm[0 ], civm[1 ], civm[2 ], civm[3 ],
        civm[4 ], civm[5 ], civm[6 ], civm[7 ],
        civm[8 ], civm[9 ], civm[10], civm[11],
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
    let district = new AMap.DistrictSearch(opts);
    let positions = []
    console.log('district',district)
    // district.search('河北', function(status, result) {
    //    console.log(status,result.districtList[0].boundaries[0])
    //    result.districtList[0].boundaries[0].forEach(ele=>{
    //         positions.push(Cesium.Cartesian3.fromDegrees(ele.lng, ele.lat, 10000));
    //     })
    //     // console.log("positions",positions)
    //     draw(positions)
    // });
    district.search('福建', function(status, result) {
        console.log(status,result.districtList[0].boundaries[0])
        result.districtList[0].boundaries.forEach(ele=>{
            ele.forEach(ele1=>{
                positions.push(Cesium.Cartesian3.fromDegrees(ele1.lng, ele1.lat, 10000));
            })
        })
        //  console.log("positions",positions)
        draw(positions)
     });
    //  district.search('江西', function(status, result) {
    //     console.log(status,result.districtList[0].boundaries[0])
    //     result.districtList[0].boundaries.forEach(ele=>{
    //         ele.forEach(ele1=>{
    //             positions.push(Cesium.Cartesian3.fromDegrees(ele1.lng, ele1.lat, 10000));
    //         })
    //     })
    //     //  console.log("positions",positions)
    //     draw(positions)
    //  });
}

function draw(positions) {
    // let positions = []
    // for (i = 0; i < 40; ++i) {
    //     positions.push(Cesium.Cartesian3.fromDegrees(-100.0 + i, 15.0));
    // }
    console.log("positions",positions)
    let entities = _this.viewer.entities;
    entities.add({
        polyline: {
          positions: positions,
          width: 5,
          material: new Cesium.Material({
            fabric: {
                type: "Fade",
                uniforms: {
                    fadeInColor: "ref",
                    fadeOutColor: "blue",
                    time:100
                }
            }
        })
        },
      });
      
      
      _this.viewer.zoomTo(entities);
}	

initCesium();
initBabylon();
getAdministrativeDivision();
_this.engine.runRenderLoop(() => {
    _this.viewer.render();
    moveBabylonCamera();
    _this.scene.render();
});