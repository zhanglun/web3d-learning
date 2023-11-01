import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { createCamera, createRender, createScene } from "../helper";

function groupMesh() {
  const geometry = new THREE.BoxGeometry(20, 20, 20);
  const material = new THREE.MeshLambertMaterial({ color: 0xffef45 });
  const group = new THREE.Group();
  const mesh1 = new THREE.Mesh(geometry, material);
  mesh1.position.set(50, 0, 0);

  geometry.translate(50,100,200,);

  //可视化mesh的局部坐标系
  const meshAxesHelper = new THREE.AxesHelper(50);
  mesh1.add(meshAxesHelper);

  const mesh2 = new THREE.Mesh(geometry, material);

  mesh2.translateX(25);
  //把mesh1型插入到组group中，mesh1作为group的子对象
  group.add(mesh1);
  //把mesh2型插入到组group中，mesh2作为group的子对象
  group.add(mesh2);
  //把group插入到场景中作为场景子对象
  group.position.set(50, 0, 0);

  return group;
}

function traverseModel() {
  // 批量创建多个长方体表示高层楼
  const group1 = new THREE.Group(); //所有高层楼的父对象
  group1.name = "高层";
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.BoxGeometry(20, 60, 10);
    const material = new THREE.MeshLambertMaterial({
      color: 0x00ffff,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = i * 30; // 网格模型mesh沿着x轴方向阵列
    group1.add(mesh); //添加到组对象group1
    mesh.name = i + 1 + "号楼";
    // console.log('mesh.name',mesh.name);
  }
  group1.position.y = 30;

  const group2 = new THREE.Group();
  group2.name = "洋房";
  // 批量创建多个长方体表示洋房
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.BoxGeometry(20, 30, 10);
    const material = new THREE.MeshLambertMaterial({
      color: 0x00ffff,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = i * 30;
    group2.add(mesh); //添加到组对象group2
    mesh.name = i + 6 + "号楼";
  }
  group2.position.z = 50;
  group2.position.y = 15;

  const model = new THREE.Group();
  model.name = "小区房子";
  model.add(group1, group2);
  model.position.set(-50, 0, -25);

  return [group1, group2, model];
}

export default function Vector() {
  const scene = createScene();
  const group = groupMesh();

  scene.add(group);

  traverseModel().map((_) => {
    scene.add(_);
  });

  const pointLight = new THREE.PointLight(0x00ff00, 5000000000.0);

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
      group.rotateX(0.01);
      group.rotateY(0.01);
      group.rotateZ(0.01);
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
