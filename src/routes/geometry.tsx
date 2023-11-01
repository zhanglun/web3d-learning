import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { createCamera, createRender, createScene } from "../helper";

function createBufferGeometryDemo() {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0,
    0,
    0, //顶点1坐标
    50,
    0,
    0, //顶点2坐标
    0,
    100,
    0, //顶点3坐标
    0,
    0,
    10, //顶点4坐标
    0,
    0,
    100, //顶点5坐标
    50,
    0,
    10, //顶点6坐标
  ]);
  // 创建属性缓冲区对象
  //3个为一组，表示一个顶点的xyz坐标
  const attribute = new THREE.BufferAttribute(vertices, 3);
  // 设置几何体attributes属性的位置属性
  geometry.attributes.position = attribute;
  const material = new THREE.MeshLambertMaterial({});

  return new THREE.Mesh(geometry, material);
}

function createBufferGeometryDemo2() {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0,
    0,
    0, //顶点1坐标
    50,
    0,
    0, //顶点2坐标
    0,
    100,
    0, //顶点3坐标
    0,
    0,
    10, //顶点4坐标
    0,
    0,
    100, //顶点5坐标
    50,
    0,
    10, //顶点6坐标
  ]);
  // 线材质对象
  const material = new THREE.LineBasicMaterial({
    color: 0xff0000, //线条颜色
  });
  // 创建线模型对象
  return new THREE.Line(geometry, material);
}

function createRectGeometryDemo() {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0, 0, 0, //顶点1坐标
    80, 0, 0, //顶点2坐标
    80, 80, 0, //顶点3坐标

    0, 0, 0, //顶点4坐标   和顶点1位置相同
    80, 80, 0, //顶点5坐标  和顶点3位置相同
    0, 80, 0, //顶点6坐标
]);

// const material = new THREE.LineBasicMaterial({
//   color: 0xff0000, //线条颜色
// });
  const attribute = new THREE.BufferAttribute(vertices, 3);
  // 设置几何体attributes属性的位置属性
  geometry.attributes.position = attribute;
  const material = new THREE.MeshLambertMaterial({});

  return new THREE.Mesh(geometry, material);
}

export default function Geometry() {
  const scene = createScene();

  const demo1 = createBufferGeometryDemo();
  scene.add(demo1);

  const demo2 = createBufferGeometryDemo2();
  scene.add(demo2);

  const rectDemo = createRectGeometryDemo();

  scene.add(rectDemo);

  const pointLight = new THREE.PointLight(0x00ff00, 5000000000.0);

  scene.add(pointLight); //点光源添加到场景中

  const pointLightHelper = new THREE.PointLightHelper(pointLight, 10);
  scene.add(pointLightHelper);
  pointLight.position.set(100, 0, 0); //点光源放在x轴上

  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  // 平行光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  // 设置光源的方向：通过光源position属性和目标指向对象的position属性计算
  directionalLight.position.set(-80, 100, 50);
  // 方向光指向对象网格模型mesh，可以不设置，默认的位置是0,0,0
  scene.add(directionalLight);

  const dirLightHelper = new THREE.DirectionalLightHelper(
    directionalLight,
    5,
    0xff0000
  );
  scene.add(dirLightHelper);

  useEffect(() => {
    const stats = new Stats();
    //stats.domElement:web页面上输出计算结果,一个div元素，
    document.body.appendChild(stats.domElement);

    const camera = createCamera();

    camera.position.set(1000, 1000, 1000);
    camera.lookAt(0, 0, 0);

    const renderer = createRender(scene, camera);
    const controls = new OrbitControls(camera, renderer.domElement);

    controls.addEventListener("change", function () {
      renderer.render(scene, camera); //执行渲染操作
    }); //监听鼠标、键盘事件

    function render() {
      stats.update();
      renderer.render(scene, camera); //执行渲染操作
      requestAnimationFrame(render); //请求再次执行渲染函数render，渲染下一帧
    }

    render();

    window.onresize = function () {
      // 重置渲染器输出画布canvas尺寸
      renderer.setSize(window.innerWidth, window.innerHeight);
      // 全屏情况下：设置观察范围长宽比aspect为窗口宽高比
      camera.aspect = window.innerWidth / window.innerHeight;
      // 渲染器执行render方法的时候会读取相机对象的投影矩阵属性projectionMatrix
      // 但是不会每渲染一帧，就通过相机的属性计算投影矩阵(节约计算资源)
      // 如果相机的一些属性发生了变化，需要执行updateProjectionMatrix ()方法更新相机的投影矩阵
      camera.updateProjectionMatrix();
    };
  }, []);

  return <div id="webgl"></div>;
}
