import { useEffect } from "react";
import * as THREE from "three";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import {
  createCamera,
  createOrbitControlsAndBindEvent,
  createRender,
  createScene,
  initRenderAndResize,
  injectStats
} from "../helper";

export function CircularArc() {
  const scene = createScene();

  const geometry = new THREE.BufferGeometry(); //创建一个几何体对象
  const R = 50; //圆弧半径
  const N = 10; //分段数量
  const sp = 2 * Math.PI / N;//两个相邻点间隔弧度
// 批量生成圆弧上的顶点数据
  const arr = [];
  for (let i = 0; i < N + 1; i++) {
    const angle =  sp * i;//当前点弧度
    // 以坐标原点为中心，在XOY平面上生成圆弧上的顶点数据
    const x = R * Math.cos(angle);
    const y = R * Math.sin(angle);
    arr.push(x, y, 0);
  }
//类型数组创建顶点数据
  const vertices = new Float32Array(arr);
// 创建属性缓冲区对象
//3个为一组，表示一个顶点的xyz坐标
  const attribute = new THREE.BufferAttribute(vertices, 3);
// 设置几何体attributes属性的位置属性
  geometry.attributes.position = attribute;

// 线材质
  const material = new THREE.LineBasicMaterial({
    color: 0xff0000 //线条颜色
  });
// 创建线模型对象   构造函数：Line、LineLoop、LineSegments
// const line = new THREE.Line(geometry, material);
  const line = new THREE.LineLoop(geometry, material);//线条模型对象

  scene.add(line);

  const pointsArr = [
    // 三维向量Vector3表示的坐标值
    new THREE.Vector3(0,0,0),
    new THREE.Vector3(0,150,0),
    new THREE.Vector3(0,200,100),
    new THREE.Vector3(0,-50,100),
  ];

  const geometry2 = new THREE.BufferGeometry(); //创建一个几何体对象

  geometry2.setFromPoints(pointsArr);
  console.log('几何体变化',geometry.attributes.position);

  const line2 = new THREE.LineLoop(geometry2, material);//线条模型对象

  scene.add(line2);

  useEffect(() => {
    const stats = injectStats();
    const camera = createCamera();

    camera.position.set(200, 200, 200);
    camera.lookAt(0, 0, 0)

    const renderer = createRender(scene, camera);

    //新版本，加载gltf，不需要执行下面代码解决颜色偏差
    renderer.outputColorSpace = THREE.SRGBColorSpace;//设置为SRGB颜色空间

    createOrbitControlsAndBindEvent(renderer, scene, camera);
    initRenderAndResize(stats, renderer, scene, camera);
  }, [])

  return <div id="webgl"></div>;
}