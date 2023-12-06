import { useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  createCamera,
  createOrbitControlsAndBindEvent,
  createRender,
  createScene,
  initRenderAndResize,
  injectStats
} from "../helper";

import img from "../assets/Substance_Graph_AmbientOcclusion.jpg";

export function GLTF() {
  const scene = createScene();

  const texLoader = new THREE.TextureLoader();
  const texture = texLoader.load(img);// 加载手机mesh另一个颜色贴图

// 创建GLTF加载器对象
  const loader = new GLTFLoader();
  loader.load('gltf/a.glb', function (gltf) {
    console.log('控制台查看加载gltf文件返回的对象结构', gltf);
    console.log('gltf对象场景属性', gltf.scene);
    // 返回的场景对象gltf.scene插入到threejs场景中
    const mesh = gltf.scene.children[7]; //获取Mesh

    console.log('mesh', mesh);

    mesh.material.map = texture; //更换不同风格的颜色贴图

    // 纹理对象texture.flipY默认值
    console.log('texture.flipY', texture.flipY);
    texture.flipY = false;

    scene.add(gltf.scene);
  })
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