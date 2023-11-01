import { useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

export default function Basic() {
  const scene = new THREE.Scene();
  const axesHelper = new THREE.AxesHelper(150);
  scene.add(axesHelper);
  const geometry = new THREE.BoxGeometry(50, 60, 20);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000, //0xff0000设置材质颜色为红色
  });
  
  const material2 = new THREE.MeshLambertMaterial({});
  const mesh = new THREE.Mesh(geometry, material); //网格模型对象Mesh
  //设置网格模型在三维空间中的位置坐标，默认是坐标原点

  mesh.position.set(0, 0, 0);

  const mesh2 = new THREE.Mesh(geometry, material2); //网格模型对象Mesh

  mesh2.position.set(50, 50, 50);

  scene.add(mesh);
  scene.add(mesh2);


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
  directionalLight.target = mesh;
  scene.add(directionalLight);

  const dirLightHelper = new THREE.DirectionalLightHelper(
    directionalLight,
    5,
    0xff0000
  );
  scene.add(dirLightHelper);

  const gui = new GUI();

  gui.add(mesh2.position, "x", 0, 180);
  gui.add(mesh2.position, "y", 0, 180);
  gui.add(mesh2.position, "z", 0, 180);
  gui.add(ambient, "intensity", 0, 2.0).name("环境光强度");
  gui.add(directionalLight, "intensity", 0, 2.0).name("平行光强度");

  // .addColor()生成颜色值改变的交互界面
  gui
    .addColor(
      {
        color: 0x00ffff,
      },
      "color"
    )
    .onChange(function (value) {
      mesh.material.color.set(value);
    });
  // 参数3数据类型：数组(下拉菜单)
  gui
    .add(
      {
        scale: 0,
      },
      "scale",
      [-100, 0, 100]
    )
    .name("y坐标")
    .onChange(function (value) {
      mesh.position.y = value;
    });

  useEffect(() => {
    //创建一个长方体几何对象Geometry
    const geometry = new THREE.BoxGeometry(100, 100, 100);

    const material = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      shininess: 20, //高光部分的亮度，默认30
      specular: 0x444444, //高光部分的颜色
    });
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const mesh = new THREE.Mesh(geometry, material); //网格模型对象Mesh
        // 在XOZ平面上分布
        mesh.position.set(i * 200, 0, j * 200);
        scene.add(mesh); //网格模型添加到场景中
      }
    }
    const stats = new Stats();
    //stats.domElement:web页面上输出计算结果,一个div元素，
    document.body.appendChild(stats.domElement);

    // 定义相机输出画布的尺寸(单位:像素px)
    const width = document.querySelector("#detail")?.offsetWidth;
    const height = document.querySelector("#detail")?.offsetHeight;

    // 实例化一个透视投影相机对象
    const camera = new THREE.PerspectiveCamera(30, width / height, 1, 8000);

    //相机在Three.js三维坐标系中的位置
    // 根据需要设置相机位置具体值
    camera.position.set(2000, 2000, 2000);
    camera.lookAt(0, 0, 0);

    // 创建渲染器对象
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.render(scene, camera); //执行渲染操作

    // 设置相机控件轨道控制器OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    // 如果OrbitControls改变了相机参数，重新调用渲染器渲染三维场景
    renderer.setSize(width, height); //设置three.js渲染区域的尺寸(像素px)
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x444444, 1); //设置背景颜色
    renderer.render(scene, camera); //执行渲染操作

    document.querySelector("#webgl")?.appendChild(renderer.domElement);

    controls.addEventListener("change", function () {
      renderer.render(scene, camera); //执行渲染操作
    }); //监听鼠标、键盘事件

    function render() {
      stats.update();
      renderer.render(scene, camera); //执行渲染操作
      mesh.rotateY(0.001); //每次绕y轴旋转0.01弧度
      mesh2.rotateX(0.01); //每次绕y轴旋转0.01弧度
      mesh2.rotateY(0.02); //每次绕y轴旋转0.01弧度
      mesh2.rotateZ(0.03); //每次绕y轴旋转0.01弧度
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
