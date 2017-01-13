# evo
vue 核心骨架

```html
<div id="app">
    <div :message="message">{{ message }}</div>

    <a v-for="(item,index) in list" @click="popMsg(item.text)">{{index}}、{{item.text}}</a>

    <div v-if="first">first</div>
    <div v-else>not</div>
</div>
<script src="../dist/evo.js"></script>
<script>
var app = new Evo({
    el: "#app",
    data: {
        first : true,
        message: "Hello Evo!",
        list:[{
            text : "Im one"
        },{
            text : "Im two"
        }]
    },
    methods:{
        popMsg(msg){
            alert(msg)
        }
    }
})
</script>
```