import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

export function createScene() {
  const scene = new THREE.Scene();
  const axesHelper = new THREE.AxesHelper(150);
  scene.add(axesHelper);

  return scene;
}

export function createCamera () {
   // 定义相机输出画布的尺寸(单位:像素px)
   const width = document.querySelector("#detail")?.offsetWidth;
   const height = document.querySelector("#detail")?.offsetHeight;
 
   // 实例化一个透视投影相机对象
   return new THREE.PerspectiveCamera(30, width / height, 1, 8000);
}

export function createRender(scene, camera) {
  // 定义相机输出画布的尺寸(单位:像素px)
  const width = document.querySelector("#detail")?.offsetWidth;
  const height = document.querySelector("#detail")?.offsetHeight;

  // 创建渲染器对象
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.render(scene, camera); //执行渲染操作

  // 设置相机控件轨道控制器OrbitControls
  // 如果OrbitControls改变了相机参数，重新调用渲染器渲染三维场景
  renderer.setSize(width, height); //设置three.js渲染区域的尺寸(像素px)
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x444444, 1); //设置背景颜色
  renderer.render(scene, camera); //执行渲染操作

  document.querySelector("#webgl")?.appendChild(renderer.domElement);

  return renderer;
}

export function createOrbitControlsAndBindEvent(renderer, scene, camera) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", function () {
    renderer.render(scene, camera);
  })
}


export function injectStats() {
  const stats = new Stats();
  //stats.domElement:web页面上输出计算结果,一个div元素，
  document.body.appendChild(stats.domElement);

  return stats;
}

export function initRenderAndResize (stats, renderer, scene, camera) {
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
}