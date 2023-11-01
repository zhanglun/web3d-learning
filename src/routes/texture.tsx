import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { createCamera, createRender, createScene } from "../helper";

import img from "../assets/Substance_Graph_AmbientOcclusion.jpg";
import compassImg from "../assets/compass.jpg";

export default function Texture() {
  const scene = createScene();

  const geometry = new THREE.SphereGeometry(200, 100, 100);
  //纹理贴图加载器TextureLoader
  const texLoader = new THREE.TextureLoader();
  // .load()方法加载图像，返回一个纹理对象Texture
  const texture = texLoader.load(img);
  const material = new THREE.MeshLambertMaterial({
    // 设置纹理贴图：Texture对象作为材质map属性的属性值
    map: texture, //map表示材质的颜色贴图属性
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // scene.add(mesh);

  const pointLight = new THREE.PointLight(0x00ff00, 50000.0);

  scene.add(pointLight); //点光源添加到场景中

  const pointLightHelper = new THREE.PointLightHelper(pointLight, 10);
  scene.add(pointLightHelper);
  pointLight.position.set(100, 100, 0); //点光源放在x轴上

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

  const geometry2 = new THREE.PlaneGeometry(2000, 2000);
  //纹理贴图加载器TextureLoader
  const texLoader2 = new THREE.TextureLoader();
  // .load()方法加载图像，返回一个纹理对象Texture
  const texture2 = texLoader2.load(img);

  // 设置阵列模式
  texture2.wrapS = THREE.RepeatWrapping;
  texture2.wrapT = THREE.RepeatWrapping;
  // uv两个方向纹理重复数量
  texture2.repeat.set(12, 12); //注意选择合适的阵列数量

  const material2 = new THREE.MeshLambertMaterial({
    // 设置纹理贴图：Texture对象作为材质map属性的属性值
    map: texture2, //map表示材质的颜色贴图属性
    side: THREE.DoubleSide,
  });
  const mesh2 = new THREE.Mesh(geometry2, material2);

  // scene.add(mesh2);

  // 矩形平面网格模型设置背景透明的png贴图
  const geometry3 = new THREE.PlaneGeometry(40, 40); //默认在XOY平面上
  const textureLoader3 = new THREE.TextureLoader();
  const material3 = new THREE.MeshBasicMaterial({
    map: textureLoader3.load(compassImg),
    transparent: true, //使用背景透明的png贴图，注意开启透明计算
  });
  const mesh3 = new THREE.Mesh(geometry3, material3);
  mesh3.rotateX(-Math.PI / 2);

  scene.add(mesh3);
  // 添加一个辅助网格地面
  const gridHelper = new THREE.GridHelper(300, 25, 0x004444, 0x004444);

  scene.add(gridHelper);

  useEffect(() => {
    const stats = new Stats();
    //stats.domElement:web页面上输出计算结果,一个div元素，
    document.body.appendChild(stats.domElement);

    const camera = createCamera();

    camera.position.set(5000, 5000, 5000);
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
