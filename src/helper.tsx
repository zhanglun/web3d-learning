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
   return new THREE.PerspectiveCamera(30, width / height, 1, 3000); 
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
