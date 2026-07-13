import { invoke } from "@tauri-apps/api/core";
import type {
  AppData,
  BookPage,
  BookPageInput,
  ContentBlock,
  ContentBlockInput,
  Entry,
  EntryInput,
  EntryType,
  KnowledgeGap,
  KnowledgeGapInput,
  Relation,
  RelationInput,
  Trail,
  TrailInput,
  TrailItem,
  TrailItemInput,
} from "../types";

interface LexiconRepository {
  loadAppData(): Promise<AppData>;
  createEntry(input: EntryInput): Promise<Entry>;
  updateEntry(id: string, input: EntryInput): Promise<Entry>;
  deleteEntry(id: string): Promise<void>;
  createBookPage(input: BookPageInput): Promise<BookPage>;
  updateBookPage(id: string, input: BookPageInput): Promise<BookPage>;
  deleteBookPage(id: string): Promise<void>;
  replaceContentBlocks(
    ownerType: "entry" | "book_page",
    ownerId: string,
    blocks: ContentBlockInput[],
  ): Promise<ContentBlock[]>;
  createRelation(input: RelationInput): Promise<Relation>;
  updateRelation(id: string, input: RelationInput): Promise<Relation>;
  deleteRelation(id: string): Promise<void>;
  createKnowledgeGap(input: KnowledgeGapInput): Promise<KnowledgeGap>;
  updateKnowledgeGap(id: string, input: KnowledgeGapInput): Promise<KnowledgeGap>;
  deleteKnowledgeGap(id: string): Promise<void>;
  createTrail(input: TrailInput): Promise<Trail>;
  updateTrail(id: string, input: TrailInput): Promise<Trail>;
  deleteTrail(id: string): Promise<void>;
  createTrailItem(input: TrailItemInput): Promise<TrailItem>;
  updateTrailItem(id: string, input: TrailItemInput): Promise<TrailItem>;
  deleteTrailItem(id: string): Promise<void>;
}

const storageKey = "lexicon-os-demo-data";

const now = () => new Date().toISOString();

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const seedData = (): AppData => {
  const timestamp = now();
  const entry = (
    id: string,
    title: string,
    entryType: EntryType,
    category: string,
    tags: string[],
    timelineDate: string,
    timelineNote: string,
    content: string,
  ): Entry => ({
    id,
    title,
    entryType,
    content,
    category,
    tags,
    timelineDate,
    timelineNote,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const page = (
    id: string,
    entryId: string,
    title: string,
    content: string,
    pageOrder: number,
  ): BookPage => ({
    id,
    entryId,
    title,
    content,
    pageOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const data: AppData = {
    entries: [
      entry("seed_cv_foundations", "Computer Vision Foundations", "book", "Computer Vision", ["overview", "geometry", "learning"], "1960s-present", "From early image understanding and projective geometry to deep visual representation learning.", "A broad atlas hub for the field: image formation, features, recognition, detection, segmentation, tracking, 3D perception, and multimodal vision."),
      entry("seed_object_detection", "Object Detection", "book", "Detection", ["task", "localization", "recognition"], "2001-present", "Modern detection moves from sliding windows and hand-built features to proposal networks, one-stage detectors, transformers, and open-vocabulary detection.", "A mini-book for locating and classifying objects in images, including proposal-based, one-stage, anchor-free, and transformer-based detectors."),
      entry("seed_segmentation", "Image Segmentation", "book", "Segmentation", ["semantic segmentation", "instance segmentation", "masks"], "1980s-present", "Segmentation connects classical grouping, dense prediction, medical imaging, and promptable foundation models.", "A mini-book for semantic, instance, panoptic, and promptable segmentation."),
      entry("seed_vision_transformers", "Vision Transformers", "book", "Architectures", ["transformer", "attention", "backbone"], "2020-present", "The ViT line reframed image recognition around patch tokens and scalable attention-based backbones.", "A mini-book for ViT, Swin, DeiT, MAE, and transformer-based perception architectures."),
      entry("seed_generative_vision", "Generative Vision", "book", "Generative Models", ["diffusion", "GAN", "image synthesis"], "2014-present", "From GANs to diffusion models, generative vision became a core way to model image distributions and controllable synthesis.", "A mini-book for image generation, restoration, editing, and representation learning through generative objectives."),
      entry("seed_image_classification", "Image Classification", "task", "Recognition", ["classification", "supervised learning"], "2012", "Deep CNNs became dominant after AlexNet on ImageNet.", "Assigns one or more labels to an image. It is often the simplest benchmark for representation quality, but it hides localization, robustness, and context failures."),
      entry("seed_object_localization", "Object Localization", "task", "Detection", ["bounding boxes", "localization"], "2000s", "Localization bridges classification and detection by requiring spatial evidence.", "Predicts where an object appears, usually with a bounding box or region, without necessarily handling multiple instances well."),
      entry("seed_semantic_segmentation", "Semantic Segmentation", "task", "Segmentation", ["dense prediction", "pixel labels"], "2015", "Fully convolutional networks made end-to-end dense prediction a standard deep learning task.", "Assigns a class label to every pixel, merging all instances of the same class into one semantic field."),
      entry("seed_instance_segmentation", "Instance Segmentation", "task", "Segmentation", ["masks", "instances"], "2017", "Mask R-CNN made instance masks a mainstream detection extension.", "Separates individual object instances and predicts a mask for each one."),
      entry("seed_panoptic_segmentation", "Panoptic Segmentation", "task", "Segmentation", ["stuff", "things", "panoptic"], "2018", "Panoptic segmentation unified semantic stuff regions and countable thing instances.", "Combines semantic segmentation for amorphous regions with instance segmentation for countable objects."),
      entry("seed_depth_estimation", "Monocular Depth Estimation", "task", "3D Vision", ["depth", "geometry"], "2014-present", "Deep monocular depth moved from supervised NYU/KITTI training to scale-ambiguous and foundation-model approaches.", "Predicts scene depth from one image, requiring learned priors because absolute scale is under-constrained."),
      entry("seed_optical_flow", "Optical Flow", "task", "Motion", ["motion", "correspondence"], "1981-present", "A classical variational problem that later became a deep correspondence benchmark.", "Estimates per-pixel motion between frames. Failure modes include occlusion, textureless surfaces, reflective regions, and large displacement."),
      entry("seed_pose_estimation", "Human Pose Estimation", "task", "Human-Centric Vision", ["keypoints", "skeletons"], "2016-present", "Deep keypoint detection is central to human activity analysis, sports analytics, and embodied interfaces.", "Detects body joints or keypoints, often with top-down person crops or bottom-up grouping."),
      entry("seed_visual_question_answering", "Visual Question Answering", "task", "Vision-Language", ["VQA", "multimodal"], "2015", "VQA exposed the need for joint visual grounding and language reasoning.", "Answers natural-language questions about images, mixing perception, grounding, commonsense, and dataset bias."),
      entry("seed_image_retrieval", "Image Retrieval", "task", "Retrieval", ["embedding", "search"], "1990s-present", "Retrieval evolved from local descriptors to learned global embeddings and vision-language search.", "Finds visually or semantically similar images from a collection using descriptors or learned embeddings."),
      entry("seed_imagenet", "ImageNet", "dataset", "Datasets", ["classification", "large-scale"], "2009", "ImageNet catalyzed large-scale supervised visual recognition and the ILSVRC benchmark.", "A large image classification dataset organized around WordNet synsets; historically central to CNN pretraining and model comparison."),
      entry("seed_coco", "MS COCO", "dataset", "Datasets", ["detection", "segmentation", "captions"], "2014", "COCO became a standard benchmark for detection, segmentation, keypoints, and captions.", "A dataset emphasizing everyday scenes with multiple objects, instance masks, captions, and contextual relationships."),
      entry("seed_pascal_voc", "PASCAL VOC", "dataset", "Datasets", ["detection", "segmentation"], "2005-2012", "VOC shaped early detection and segmentation evaluation before COCO became dominant.", "A compact benchmark suite for classification, detection, and segmentation with 20 object categories."),
      entry("seed_cityscapes", "Cityscapes", "dataset", "Datasets", ["driving", "segmentation"], "2016", "Cityscapes is a key urban scene understanding benchmark for autonomous driving.", "High-quality street-scene dataset with fine semantic annotations for road, vehicles, pedestrians, signs, and urban layout."),
      entry("seed_ade20k", "ADE20K", "dataset", "Datasets", ["scene parsing", "segmentation"], "2017", "ADE20K pushed dense scene parsing beyond object-centric datasets.", "Scene parsing dataset with many object and stuff categories, often used for semantic segmentation and scene understanding."),
      entry("seed_kitti", "KITTI", "dataset", "Datasets", ["driving", "3D detection", "depth"], "2012", "KITTI became a foundational autonomous driving benchmark.", "Driving dataset with stereo, LiDAR, optical flow, depth, odometry, tracking, and 3D detection tasks."),
      entry("seed_laion", "LAION-5B", "dataset", "Datasets", ["web-scale", "vision-language"], "2022", "LAION made large-scale image-text pretraining datasets broadly accessible.", "A web-scale image-text dataset used for contrastive and generative vision-language training."),
      entry("seed_alexnet", "AlexNet", "model", "CNN Models", ["CNN", "ImageNet"], "2012", "AlexNet triggered the modern deep learning shift in computer vision.", "A deep CNN with ReLU activations, dropout, data augmentation, and GPU training that dramatically improved ImageNet classification."),
      entry("seed_vgg", "VGGNet", "model", "CNN Models", ["CNN", "backbone"], "2014", "VGG showed the value of depth and simple repeated 3x3 convolutions.", "A plain deep CNN family valued for its simplicity and transfer-learning utility, despite high compute cost."),
      entry("seed_inception", "Inception / GoogLeNet", "model", "CNN Models", ["multi-scale", "CNN"], "2014", "Inception popularized multi-branch modules for efficient multi-scale processing.", "A CNN architecture using parallel filters and dimensionality reduction to balance accuracy and compute."),
      entry("seed_resnet", "ResNet", "model", "CNN Models", ["residual learning", "backbone"], "2015", "Residual connections made very deep networks trainable.", "A backbone family built around identity skip connections, central to recognition, detection, segmentation, and transfer learning."),
      entry("seed_densenet", "DenseNet", "model", "CNN Models", ["dense connections", "feature reuse"], "2016", "DenseNet emphasized feature reuse through dense connectivity.", "A CNN architecture where each layer receives outputs from all earlier layers, improving gradient flow and parameter efficiency."),
      entry("seed_mobilenetv2", "MobileNetV2", "model", "Efficient Models", ["mobile", "depthwise convolution"], "2018", "MobileNetV2 became a common efficient backbone for edge vision.", "Uses inverted residuals and depthwise separable convolutions for mobile-friendly visual recognition."),
      entry("seed_efficientnet", "EfficientNet", "model", "Efficient Models", ["compound scaling", "backbone"], "2019", "EfficientNet systematized compound scaling of depth, width, and resolution.", "A family of CNNs balancing accuracy and efficiency through neural architecture search and scaling rules."),
      entry("seed_faster_rcnn", "Faster R-CNN", "model", "Detection Models", ["two-stage detector", "RPN"], "2015", "Faster R-CNN integrated region proposal learning into the detector.", "A two-stage detector using a Region Proposal Network followed by ROI classification and box regression."),
      entry("seed_yolo", "YOLO", "model", "Detection Models", ["one-stage detector", "real-time"], "2016-present", "YOLO popularized real-time one-stage detection.", "A family of detectors that directly predicts object boxes and classes in one pass, emphasizing deployment speed."),
      entry("seed_ssd", "SSD", "model", "Detection Models", ["one-stage detector", "anchors"], "2016", "SSD made multi-scale one-stage detection practical.", "Single Shot MultiBox Detector predicts boxes from multiple feature maps at different resolutions."),
      entry("seed_mask_rcnn", "Mask R-CNN", "model", "Segmentation Models", ["instance segmentation", "ROIAlign"], "2017", "Mask R-CNN extended Faster R-CNN with high-quality instance masks.", "Adds a mask prediction branch and ROIAlign to two-stage detection for instance segmentation."),
      entry("seed_unet", "U-Net", "model", "Segmentation Models", ["medical imaging", "encoder-decoder"], "2015", "U-Net became a default architecture for biomedical segmentation.", "An encoder-decoder network with skip connections that preserve localization detail for dense masks."),
      entry("seed_deeplab", "DeepLabv3+", "model", "Segmentation Models", ["atrous convolution", "ASPP"], "2018", "DeepLabv3+ combines atrous spatial pyramid pooling with encoder-decoder refinement.", "A semantic segmentation model designed for multi-scale context and sharper object boundaries."),
      entry("seed_vit", "Vision Transformer", "model", "Transformer Models", ["ViT", "patch tokens"], "2020", "ViT showed that pure transformers can scale effectively for image recognition.", "Splits an image into patches, embeds them as tokens, and applies transformer encoder layers."),
      entry("seed_swin", "Swin Transformer", "model", "Transformer Models", ["hierarchical transformer", "window attention"], "2021", "Swin adapted transformers to hierarchical dense vision tasks.", "Uses shifted local windows to control attention cost while producing multi-scale feature maps."),
      entry("seed_detr", "DETR", "model", "Detection Models", ["transformer", "set prediction"], "2020", "DETR reframed detection as direct set prediction.", "Uses a transformer decoder and bipartite matching to remove anchors and non-maximum suppression from the core detector."),
      entry("seed_sam", "Segment Anything Model", "model", "Foundation Models", ["promptable segmentation", "foundation model"], "2023", "SAM made promptable segmentation a general-purpose interaction pattern.", "A segmentation foundation model that accepts points, boxes, or masks as prompts and returns object masks."),
      entry("seed_dinov2", "DINOv2", "model", "Foundation Models", ["self-supervised", "representation"], "2023", "DINOv2 provided strong self-supervised visual features without labels.", "A self-supervised vision model family used as a general-purpose backbone for downstream dense and global tasks."),
      entry("seed_clip", "CLIP", "model", "Vision-Language Models", ["contrastive learning", "zero-shot"], "2021", "CLIP connected image representations to natural-language supervision at web scale.", "A vision-language model trained to align images and text, enabling zero-shot classification and retrieval."),
      entry("seed_stable_diffusion", "Stable Diffusion", "model", "Generative Models", ["diffusion", "latent diffusion"], "2022", "Latent diffusion made text-to-image generation practical on commodity GPUs.", "A latent diffusion model for text-conditioned image generation, editing, inpainting, and visual concept exploration."),
      entry("seed_alexnet_paper", "ImageNet Classification with Deep Convolutional Neural Networks", "paper", "Papers", ["AlexNet", "ImageNet"], "2012", "The canonical AlexNet paper.", "Krizhevsky, Sutskever, and Hinton demonstrated a large CNN trained on GPUs with major ImageNet gains."),
      entry("seed_resnet_paper", "Deep Residual Learning for Image Recognition", "paper", "Papers", ["ResNet", "residual learning"], "2015", "The ResNet paper introduced residual blocks for very deep networks.", "He et al. showed that skip connections allow networks with over 100 layers to optimize effectively."),
      entry("seed_vit_paper", "An Image is Worth 16x16 Words", "paper", "Papers", ["ViT", "transformer"], "2020", "The original Vision Transformer paper.", "Dosovitskiy et al. treated image patches as tokens and demonstrated strong scaling with large pretraining."),
      entry("seed_detr_paper", "End-to-End Object Detection with Transformers", "paper", "Papers", ["DETR", "set prediction"], "2020", "The DETR paper.", "Carion et al. removed many hand-designed detector components by using transformers and Hungarian matching."),
      entry("seed_mask_rcnn_paper", "Mask R-CNN Paper", "paper", "Papers", ["Mask R-CNN", "instance segmentation"], "2017", "The Mask R-CNN paper.", "He et al. added a parallel mask branch and ROIAlign to Faster R-CNN for instance segmentation."),
      entry("seed_unet_paper", "U-Net Paper", "paper", "Papers", ["U-Net", "medical imaging"], "2015", "The U-Net paper.", "Ronneberger et al. proposed an encoder-decoder architecture with skip connections for biomedical segmentation."),
      entry("seed_sam_paper", "Segment Anything Paper", "paper", "Papers", ["SAM", "promptable segmentation"], "2023", "The Segment Anything paper introduced a large-scale promptable segmentation system.", "Kirillov et al. combined a promptable model, a data engine, and the SA-1B mask dataset."),
      entry("seed_clip_paper", "Learning Transferable Visual Models From Natural Language Supervision", "paper", "Papers", ["CLIP", "vision-language"], "2021", "The CLIP paper.", "Radford et al. trained image-text contrastive models on internet-scale pairs for transferable zero-shot recognition."),
      entry("seed_mean_average_precision", "Mean Average Precision", "metric", "Metrics", ["mAP", "detection"], "", "", "Detection metric averaging precision over recall levels, classes, and often IoU thresholds."),
      entry("seed_iou", "Intersection over Union", "metric", "Metrics", ["IoU", "overlap"], "", "", "Overlap metric computed as intersection area divided by union area for boxes or masks."),
      entry("seed_dice", "Dice Coefficient", "metric", "Metrics", ["segmentation", "medical imaging"], "", "", "Segmentation overlap metric emphasizing twice the intersection over summed prediction and target sizes."),
      entry("seed_fid", "Frechet Inception Distance", "metric", "Metrics", ["generative models", "FID"], "2017", "Common metric for image generation quality.", "Compares generated and real image distributions using Gaussian statistics in Inception feature space."),
      entry("seed_psnr", "PSNR", "metric", "Metrics", ["image restoration", "signal quality"], "", "", "Peak signal-to-noise ratio, common in super-resolution and restoration but often weakly aligned with perceptual quality."),
      entry("seed_ssim", "SSIM", "metric", "Metrics", ["image quality", "structure"], "2004", "Structural Similarity Index.", "Image quality metric comparing luminance, contrast, and structure rather than raw pixel error alone."),
      entry("seed_top1_accuracy", "Top-1 Accuracy", "metric", "Metrics", ["classification", "accuracy"], "", "", "Classification metric counting examples where the highest-scoring predicted class matches the label."),
      entry("seed_panoptic_quality", "Panoptic Quality", "metric", "Metrics", ["panoptic segmentation", "PQ"], "2018", "Metric introduced for panoptic segmentation.", "Combines recognition quality and segmentation quality for thing and stuff regions."),
      entry("seed_convolution", "Convolution", "concept", "Core Concepts", ["filters", "translation equivariance"], "", "", "Local weighted operation that gives CNNs useful inductive bias for images through weight sharing and locality."),
      entry("seed_feature_pyramid_network", "Feature Pyramid Network", "method", "Detection Methods", ["FPN", "multi-scale"], "2017", "FPN made multi-scale feature hierarchies standard in detection.", "Builds semantically strong features at multiple resolutions for objects of different sizes."),
      entry("seed_non_maximum_suppression", "Non-Maximum Suppression", "method", "Detection Methods", ["NMS", "post-processing"], "", "", "Post-processing method that removes duplicate detections by suppressing lower-scoring boxes with high overlap."),
      entry("seed_anchor_boxes", "Anchor Boxes", "concept", "Detection Methods", ["anchors", "priors"], "2015-present", "Anchor boxes shaped most pre-transformer detectors.", "Predefined box priors used to predict object location offsets and classes at many positions and scales."),
      entry("seed_data_augmentation", "Data Augmentation", "method", "Training Methods", ["regularization", "robustness"], "", "", "Applies transformations such as crop, flip, color jitter, mixup, mosaic, and cutout to improve generalization."),
      entry("seed_transfer_learning", "Transfer Learning", "method", "Training Methods", ["pretraining", "fine-tuning"], "", "", "Uses representations learned on one dataset or task as initialization for another task."),
      entry("seed_self_supervised_learning", "Self-Supervised Visual Pretraining", "method", "Training Methods", ["SSL", "pretraining"], "2018-present", "Self-supervised learning reduced reliance on manual labels.", "Learns useful image representations from pretext, contrastive, masked, clustering, or teacher-student objectives."),
      entry("seed_contrastive_learning", "Contrastive Learning", "method", "Training Methods", ["contrastive", "representation"], "2018-present", "Contrastive visual learning became central to self-supervised and vision-language models.", "Pulls related views or image-text pairs together while pushing unrelated examples apart in representation space."),
      entry("seed_diffusion_process", "Diffusion Process", "concept", "Generative Models", ["denoising", "score matching"], "2020-present", "Diffusion became the dominant image generation paradigm.", "Learns to reverse a gradual noising process, often by predicting noise or denoised latents at each timestep."),
      entry("seed_promptable_segmentation", "Promptable Segmentation", "concept", "Segmentation", ["SAM", "interactive vision"], "2023", "Promptable segmentation changed masks from fixed class predictions to interactive object selection.", "Segmentation conditioned on user or model prompts such as points, boxes, masks, or text-like interaction."),
      entry("seed_open_vocabulary_detection", "Open-Vocabulary Detection", "task", "Detection", ["open vocabulary", "vision-language"], "2021-present", "Vision-language models enabled detectors beyond closed training categories.", "Detects objects described by arbitrary text labels rather than a fixed closed category set."),
      entry("seed_coco_benchmark", "COCO Detection Benchmark", "benchmark", "Benchmarks", ["COCO", "mAP"], "2015-present", "COCO AP became the default detector comparison metric.", "Benchmark protocol using AP averaged across classes and IoU thresholds from 0.50 to 0.95."),
    ],
    bookPages: [
      page("seed_cv_foundations_overview", "seed_cv_foundations", "Overview", "Computer vision is the study of making images computationally useful.\n\n- Image formation and geometry\n- Recognition and dense prediction\n- Motion and 3D perception\n- Vision-language and generative models", 1),
      page("seed_cv_foundations_axes", "seed_cv_foundations", "Core Axes", "- What is in the image?\n- Where is it?\n- What changed over time?\n- What 3D structure caused this 2D projection?\n- Which language concepts can ground the visual evidence?", 2),
      page("seed_cv_foundations_failures", "seed_cv_foundations", "Failure Modes", "- Dataset bias and shortcut learning\n- Small objects and occlusion\n- Domain shift\n- Long-tail categories\n- Calibration and robustness under distribution shift", 3),
      page("seed_object_detection_overview", "seed_object_detection", "Overview", "Detection predicts object categories and spatial boxes.\n\nThe central design tradeoff is often accuracy versus latency, with additional pressure from long-tail labels and crowded scenes.", 1),
      page("seed_object_detection_families", "seed_object_detection", "Detector Families", "- Two-stage: R-CNN, Faster R-CNN, Mask R-CNN\n- One-stage: SSD, YOLO, RetinaNet\n- Anchor-free: FCOS, CenterNet\n- Transformer: DETR and variants\n- Open-vocabulary: CLIP-conditioned detectors", 2),
      page("seed_object_detection_eval", "seed_object_detection", "Evaluation Notes", "COCO AP averages over IoU thresholds, so box quality matters more than in older AP@0.5 reporting.\n\nTrack small, medium, and large object AP separately.", 3),
      page("seed_segmentation_overview", "seed_segmentation", "Overview", "Segmentation turns recognition into spatial delineation. It can mean class-level regions, individual masks, panoptic scene decomposition, or promptable masks.", 1),
      page("seed_segmentation_types", "seed_segmentation", "Segmentation Types", "- Semantic: every pixel gets a class\n- Instance: each object instance gets a mask\n- Panoptic: things plus stuff\n- Promptable: user/model prompts condition the mask", 2),
      page("seed_vision_transformers_overview", "seed_vision_transformers", "Overview", "Vision transformers replace fixed convolutional locality with token mixing through attention. The key questions are scale, data, inductive bias, and dense prediction adaptation.", 1),
      page("seed_vision_transformers_variants", "seed_vision_transformers", "Variants", "- ViT: global patch tokens\n- DeiT: data-efficient training\n- Swin: shifted local windows and hierarchy\n- MAE: masked image modeling\n- DETR: transformer set prediction for detection", 2),
      page("seed_generative_vision_overview", "seed_generative_vision", "Overview", "Generative vision models learn image distributions for synthesis, editing, restoration, representation learning, and controlled generation.", 1),
      page("seed_generative_vision_diffusion", "seed_generative_vision", "Diffusion Notes", "Diffusion models learn denoising trajectories. Latent diffusion reduces compute by operating in compressed latent space while retaining perceptual structure.", 2),
    ],
    contentBlocks: [],
    relations: [
      makeRelation("seed_rel_cv_classification", "seed_cv_foundations", "seed_image_classification", "contains", timestamp),
      makeRelation("seed_rel_cv_detection", "seed_cv_foundations", "seed_object_detection", "contains", timestamp),
      makeRelation("seed_rel_cv_segmentation", "seed_cv_foundations", "seed_segmentation", "contains", timestamp),
      makeRelation("seed_rel_detection_map", "seed_object_detection", "seed_mean_average_precision", "evaluated by", timestamp),
      makeRelation("seed_rel_detection_iou", "seed_object_detection", "seed_iou", "depends on", timestamp),
      makeRelation("seed_rel_seg_iou", "seed_segmentation", "seed_iou", "evaluated by", timestamp),
      makeRelation("seed_rel_seg_dice", "seed_segmentation", "seed_dice", "evaluated by", timestamp),
      makeRelation("seed_rel_panoptic_pq", "seed_panoptic_segmentation", "seed_panoptic_quality", "evaluated by", timestamp),
      makeRelation("seed_rel_alexnet_imagenet", "seed_alexnet", "seed_imagenet", "trained on", timestamp),
      makeRelation("seed_rel_alexnet_paper", "seed_alexnet_paper", "seed_alexnet", "introduces", timestamp),
      makeRelation("seed_rel_resnet_paper", "seed_resnet_paper", "seed_resnet", "introduces", timestamp),
      makeRelation("seed_rel_vit_paper", "seed_vit_paper", "seed_vit", "introduces", timestamp),
      makeRelation("seed_rel_detr_paper", "seed_detr_paper", "seed_detr", "introduces", timestamp),
      makeRelation("seed_rel_mask_paper", "seed_mask_rcnn_paper", "seed_mask_rcnn", "introduces", timestamp),
      makeRelation("seed_rel_unet_paper", "seed_unet_paper", "seed_unet", "introduces", timestamp),
      makeRelation("seed_rel_sam_paper", "seed_sam_paper", "seed_sam", "introduces", timestamp),
      makeRelation("seed_rel_clip_paper", "seed_clip_paper", "seed_clip", "introduces", timestamp),
      makeRelation("seed_rel_faster_coco", "seed_faster_rcnn", "seed_coco", "evaluated on", timestamp),
      makeRelation("seed_rel_yolo_coco", "seed_yolo", "seed_coco", "evaluated on", timestamp),
      makeRelation("seed_rel_mask_coco", "seed_mask_rcnn", "seed_coco", "evaluated on", timestamp),
      makeRelation("seed_rel_deeplab_city", "seed_deeplab", "seed_cityscapes", "evaluated on", timestamp),
      makeRelation("seed_rel_unet_seg", "seed_unet", "seed_segmentation", "used for", timestamp),
      makeRelation("seed_rel_sam_prompt", "seed_sam", "seed_promptable_segmentation", "enables", timestamp),
      makeRelation("seed_rel_clip_open_vocab", "seed_clip", "seed_open_vocabulary_detection", "supports", timestamp),
      makeRelation("seed_rel_detr_detection", "seed_detr", "seed_object_detection", "solves", timestamp),
      makeRelation("seed_rel_fpn_detection", "seed_feature_pyramid_network", "seed_object_detection", "used in", timestamp),
      makeRelation("seed_rel_nms_detection", "seed_non_maximum_suppression", "seed_object_detection", "post-processes", timestamp),
      makeRelation("seed_rel_anchor_detection", "seed_anchor_boxes", "seed_object_detection", "parameterizes", timestamp),
      makeRelation("seed_rel_diffusion_stable", "seed_diffusion_process", "seed_stable_diffusion", "underlies", timestamp),
      makeRelation("seed_rel_stable_fid", "seed_stable_diffusion", "seed_fid", "evaluated by", timestamp),
      makeRelation("seed_rel_ssl_dino", "seed_self_supervised_learning", "seed_dinov2", "underlies", timestamp),
      makeRelation("seed_rel_contrastive_clip", "seed_contrastive_learning", "seed_clip", "underlies", timestamp),
    ],
    knowledgeGaps: [
      makeGap("seed_gap_detector_calibration", "seed_object_detection", "Detector calibration under domain shift", "Track whether confidence scores remain meaningful when detectors move from COCO-like images to production footage.", timestamp),
      makeGap("seed_gap_small_objects", "seed_object_detection", "Small object AP failure cases", "Collect examples where FPNs, anchors, or input resolution dominate detection quality.", timestamp),
      makeGap("seed_gap_seg_boundaries", "seed_segmentation", "Boundary quality versus region IoU", "Separate metrics and visual checks for boundary precision from coarse mask overlap.", timestamp),
      makeGap("seed_gap_vit_data_scale", "seed_vision_transformers", "ViT data scale requirements", "Compare when transformers need large pretraining versus when convolutional inductive bias still helps.", timestamp),
      makeGap("seed_gap_diffusion_eval", "seed_generative_vision", "Diffusion evaluation beyond FID", "Collect metrics and human-evaluation protocols for prompt alignment, diversity, artifacts, and safety.", timestamp),
      makeGap("seed_gap_open_vocab_long_tail", "seed_open_vocabulary_detection", "Open-vocabulary long-tail behavior", "Track how text prompts, base classes, and unseen categories affect detector reliability.", timestamp),
    ],
    trails: [
      {
        id: "seed_trail_detection_stack",
        title: "Object Detection Stack",
        description: "A route from task definition through detector families, datasets, and metrics.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_trail_segmentation_stack",
        title: "Segmentation Stack",
        description: "A route through dense prediction, masks, promptable segmentation, and evaluation.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: "seed_trail_foundation_models",
        title: "Vision Foundation Models",
        description: "A route through scalable pretraining, vision-language alignment, and promptable vision.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    trailItems: [
      makeTrailItem("seed_trail_detection_stack_item_0", "seed_trail_detection_stack", "seed_object_detection", 1, "Start with the task and problem shape.", timestamp),
      makeTrailItem("seed_trail_detection_stack_item_1", "seed_trail_detection_stack", "seed_faster_rcnn", 2, "Study two-stage proposal-based detection.", timestamp),
      makeTrailItem("seed_trail_detection_stack_item_2", "seed_trail_detection_stack", "seed_yolo", 3, "Compare one-stage real-time detection.", timestamp),
      makeTrailItem("seed_trail_detection_stack_item_3", "seed_trail_detection_stack", "seed_detr", 4, "Move to transformer set prediction.", timestamp),
      makeTrailItem("seed_trail_detection_stack_item_4", "seed_trail_detection_stack", "seed_mean_average_precision", 5, "End with the evaluation metric.", timestamp),
      makeTrailItem("seed_trail_segmentation_stack_item_0", "seed_trail_segmentation_stack", "seed_segmentation", 1, "Start with segmentation variants.", timestamp),
      makeTrailItem("seed_trail_segmentation_stack_item_1", "seed_trail_segmentation_stack", "seed_unet", 2, "Study encoder-decoder masks.", timestamp),
      makeTrailItem("seed_trail_segmentation_stack_item_2", "seed_trail_segmentation_stack", "seed_mask_rcnn", 3, "Connect detection to instance masks.", timestamp),
      makeTrailItem("seed_trail_segmentation_stack_item_3", "seed_trail_segmentation_stack", "seed_sam", 4, "Move to promptable segmentation.", timestamp),
      makeTrailItem("seed_trail_foundation_models_item_0", "seed_trail_foundation_models", "seed_self_supervised_learning", 1, "Start with label-free visual pretraining.", timestamp),
      makeTrailItem("seed_trail_foundation_models_item_1", "seed_trail_foundation_models", "seed_vit", 2, "Study scalable transformer backbones.", timestamp),
      makeTrailItem("seed_trail_foundation_models_item_2", "seed_trail_foundation_models", "seed_clip", 3, "Add language supervision.", timestamp),
      makeTrailItem("seed_trail_foundation_models_item_3", "seed_trail_foundation_models", "seed_dinov2", 4, "Compare self-supervised foundation features.", timestamp),
      makeTrailItem("seed_trail_foundation_models_item_4", "seed_trail_foundation_models", "seed_sam", 5, "End with promptable foundation segmentation.", timestamp),
    ],
  };

  return normalizeData(data);
};

const previousSeedEntryIds = new Set([
  "seed_clip",
  "seed_downstream_task",
  "seed_contrastive_learning",
  "seed_zero_shot",
  "seed_hamlet",
  "seed_death",
  "seed_motif",
  "seed_paradise_lost",
  "seed_waste_land",
  "seed_negative_capability",
  "seed_elegy",
  "seed_ekphrasis",
  "seed_pastoral",
  "seed_free_indirect_discourse",
  "seed_metaphysical_conceit",
  "seed_allusion",
]);

const previousSeedTrailIds = new Set([
  "seed_trail_vlm",
  "seed_trail_death_lit",
  "seed_trail_tragedy_knowledge",
  "seed_trail_form_history",
  "seed_trail_mediation",
]);

const shouldReplacePreviousSeed = (data: AppData) =>
  !data.entries.some((entry) => entry.id === "seed_cv_foundations") &&
  data.entries.some((entry) => previousSeedEntryIds.has(entry.id));

const replacePreviousSeedData = (data: AppData): AppData => {
  if (!shouldReplacePreviousSeed(data)) {
    return data;
  }

  const cvSeed = seedData();
  const previousPageIds = new Set(
    data.bookPages
      .filter((page) => previousSeedEntryIds.has(page.entryId))
      .map((page) => page.id),
  );

  return normalizeData({
    entries: [
      ...data.entries.filter((entry) => !previousSeedEntryIds.has(entry.id)),
      ...cvSeed.entries,
    ],
    bookPages: [
      ...data.bookPages.filter(
        (page) => !previousSeedEntryIds.has(page.entryId) && !previousPageIds.has(page.id),
      ),
      ...cvSeed.bookPages,
    ],
    contentBlocks: [
      ...data.contentBlocks.filter(
        (block) =>
          !(block.ownerType === "entry" && previousSeedEntryIds.has(block.ownerId)) &&
          !(block.ownerType === "book_page" && previousPageIds.has(block.ownerId)),
      ),
      ...cvSeed.contentBlocks,
    ],
    relations: [
      ...data.relations.filter(
        (relation) =>
          !previousSeedEntryIds.has(relation.fromEntryId) &&
          !previousSeedEntryIds.has(relation.toEntryId),
      ),
      ...cvSeed.relations,
    ],
    knowledgeGaps: [
      ...data.knowledgeGaps.filter((gap) => !previousSeedEntryIds.has(gap.entryId)),
      ...cvSeed.knowledgeGaps,
    ],
    trails: [
      ...data.trails.filter((trail) => !previousSeedTrailIds.has(trail.id)),
      ...cvSeed.trails,
    ],
    trailItems: [
      ...data.trailItems.filter(
        (item) =>
          !previousSeedTrailIds.has(item.trailId) &&
          !previousSeedEntryIds.has(item.entryId),
      ),
      ...cvSeed.trailItems,
    ],
  });
};

const isTauriRuntime = () =>
  typeof window !== "undefined" &&
  Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown })
      .__TAURI_INTERNALS__ ||
      (window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown }).__TAURI__,
  );

class TauriLexiconRepository implements LexiconRepository {
  loadAppData() {
    return invoke<AppData>("load_app_data");
  }

  createEntry(input: EntryInput) {
    return invoke<Entry>("create_entry", { input });
  }

  updateEntry(id: string, input: EntryInput) {
    return invoke<Entry>("update_entry", { id, input });
  }

  deleteEntry(id: string) {
    return invoke<void>("delete_entry", { id });
  }

  createBookPage(input: BookPageInput) {
    return invoke<BookPage>("create_book_page", { input });
  }

  updateBookPage(id: string, input: BookPageInput) {
    return invoke<BookPage>("update_book_page", { id, input });
  }

  deleteBookPage(id: string) {
    return invoke<void>("delete_book_page", { id });
  }

  replaceContentBlocks(ownerType: "entry" | "book_page", ownerId: string, blocks: ContentBlockInput[]) {
    return invoke<ContentBlock[]>("replace_content_blocks", { ownerType, ownerId, blocks });
  }

  createRelation(input: RelationInput) {
    return invoke<Relation>("create_relation", { input });
  }

  updateRelation(id: string, input: RelationInput) {
    return invoke<Relation>("update_relation", { id, input });
  }

  deleteRelation(id: string) {
    return invoke<void>("delete_relation", { id });
  }

  createKnowledgeGap(input: KnowledgeGapInput) {
    return invoke<KnowledgeGap>("create_knowledge_gap", { input });
  }

  updateKnowledgeGap(id: string, input: KnowledgeGapInput) {
    return invoke<KnowledgeGap>("update_knowledge_gap", { id, input });
  }

  deleteKnowledgeGap(id: string) {
    return invoke<void>("delete_knowledge_gap", { id });
  }

  createTrail(input: TrailInput) {
    return invoke<Trail>("create_trail", { input });
  }

  updateTrail(id: string, input: TrailInput) {
    return invoke<Trail>("update_trail", { id, input });
  }

  deleteTrail(id: string) {
    return invoke<void>("delete_trail", { id });
  }

  createTrailItem(input: TrailItemInput) {
    return invoke<TrailItem>("create_trail_item", { input });
  }

  updateTrailItem(id: string, input: TrailItemInput) {
    return invoke<TrailItem>("update_trail_item", { id, input });
  }

  deleteTrailItem(id: string) {
    return invoke<void>("delete_trail_item", { id });
  }
}

class DemoLexiconRepository implements LexiconRepository {
  async loadAppData() {
    return this.read();
  }

  async createEntry(input: EntryInput) {
    const data = this.read();
    const timestamp = now();
    const entry: Entry = {
      id: createId(input.entryType),
      ...input,
      title: input.title.trim() || "Untitled",
      tags: normalizeTags(input.tags),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.entries = [...data.entries, entry].sort(sortByTitle);
    this.write(data);
    return entry;
  }

  async updateEntry(id: string, input: EntryInput) {
    const data = this.read();
    const existing = data.entries.find((entry) => entry.id === id);
    if (!existing) {
      throw new Error("Entry not found");
    }
    const updated: Entry = {
      ...existing,
      ...input,
      title: input.title.trim() || "Untitled",
      tags: normalizeTags(input.tags),
      updatedAt: now(),
    };
    data.entries = data.entries.map((entry) => (entry.id === id ? updated : entry)).sort(sortByTitle);
    this.write(data);
    return updated;
  }

  async deleteEntry(id: string) {
    const data = this.read();
    const pageIds = data.bookPages.filter((page) => page.entryId === id).map((page) => page.id);
    data.entries = data.entries.filter((entry) => entry.id !== id);
    data.bookPages = data.bookPages.filter((page) => page.entryId !== id);
    data.contentBlocks = data.contentBlocks.filter(
      (block) =>
        !(block.ownerType === "entry" && block.ownerId === id) &&
        !(block.ownerType === "book_page" && pageIds.includes(block.ownerId)),
    );
    data.relations = data.relations.filter(
      (relation) => relation.fromEntryId !== id && relation.toEntryId !== id,
    );
    data.knowledgeGaps = data.knowledgeGaps
      .filter((gap) => gap.entryId !== id)
      .map((gap) => (gap.resolvedEntryId === id ? { ...gap, resolvedEntryId: "" } : gap));
    data.trailItems = data.trailItems.filter((item) => item.entryId !== id);
    this.write(data);
  }

  async createBookPage(input: BookPageInput) {
    const data = this.read();
    const timestamp = now();
    const page: BookPage = {
      id: createId("page"),
      ...input,
      title: input.title.trim() || "Untitled Page",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.bookPages = [...data.bookPages, page].sort(sortPages);
    this.write(data);
    return page;
  }

  async updateBookPage(id: string, input: BookPageInput) {
    const data = this.read();
    const existing = data.bookPages.find((page) => page.id === id);
    if (!existing) {
      throw new Error("Book page not found");
    }
    const updated: BookPage = {
      ...existing,
      ...input,
      title: input.title.trim() || "Untitled Page",
      updatedAt: now(),
    };
    data.bookPages = data.bookPages.map((page) => (page.id === id ? updated : page)).sort(sortPages);
    this.write(data);
    return updated;
  }

  async deleteBookPage(id: string) {
    const data = this.read();
    data.bookPages = data.bookPages.filter((page) => page.id !== id);
    data.contentBlocks = data.contentBlocks.filter(
      (block) => !(block.ownerType === "book_page" && block.ownerId === id),
    );
    this.write(data);
  }

  async replaceContentBlocks(
    ownerType: "entry" | "book_page",
    ownerId: string,
    blocks: ContentBlockInput[],
  ) {
    const data = this.read();
    const timestamp = now();
    const savedBlocks = blocks.map((block, index): ContentBlock => ({
      id: createId("block"),
      ownerType,
      ownerId,
      blockType: block.blockType,
      content: block.content,
      metadata: normalizeMetadata(block.metadata),
      blockOrder: Math.max(block.blockOrder, index + 1),
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    data.contentBlocks = [
      ...data.contentBlocks.filter(
        (block) => !(block.ownerType === ownerType && block.ownerId === ownerId),
      ),
      ...savedBlocks,
    ].sort(sortBlocks);

    const projection = projectBlocksToContent(savedBlocks);
    if (ownerType === "entry") {
      data.entries = data.entries.map((entry) =>
        entry.id === ownerId ? { ...entry, content: projection, updatedAt: timestamp } : entry,
      );
    } else {
      data.bookPages = data.bookPages.map((page) =>
        page.id === ownerId ? { ...page, content: projection, updatedAt: timestamp } : page,
      );
    }

    this.write(data);
    return savedBlocks;
  }

  async createRelation(input: RelationInput) {
    const data = this.read();
    const relationType = input.relationType.trim() || "related to";
    const existing = data.relations.find(
      (relation) =>
        relation.fromEntryId === input.fromEntryId &&
        relation.toEntryId === input.toEntryId &&
        relation.relationType === relationType,
    );
    if (existing) {
      return existing;
    }
    const timestamp = now();
    const relation: Relation = {
      id: createId("relation"),
      ...input,
      relationType,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.relations = [...data.relations, relation];
    this.write(data);
    return relation;
  }

  async updateRelation(id: string, input: RelationInput) {
    const data = this.read();
    const existing = data.relations.find((relation) => relation.id === id);
    if (!existing) {
      throw new Error("Relation not found");
    }
    const updated: Relation = {
      ...existing,
      ...input,
      relationType: input.relationType.trim() || "related to",
      updatedAt: now(),
    };
    data.relations = data.relations.map((relation) => (relation.id === id ? updated : relation));
    this.write(data);
    return updated;
  }

  async deleteRelation(id: string) {
    const data = this.read();
    data.relations = data.relations.filter((relation) => relation.id !== id);
    this.write(data);
  }

  async createKnowledgeGap(input: KnowledgeGapInput) {
    const data = this.read();
    const timestamp = now();
    const gap: KnowledgeGap = {
      id: createId("gap"),
      ...input,
      title: input.title.trim() || "Untitled Gap",
      status: input.status || "open",
      resolvedEntryId: input.resolvedEntryId || "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.knowledgeGaps = [...data.knowledgeGaps, gap].sort(sortGaps);
    this.write(data);
    return gap;
  }

  async updateKnowledgeGap(id: string, input: KnowledgeGapInput) {
    const data = this.read();
    const existing = data.knowledgeGaps.find((gap) => gap.id === id);
    if (!existing) {
      throw new Error("Knowledge gap not found");
    }
    const updated: KnowledgeGap = {
      ...existing,
      ...input,
      title: input.title.trim() || "Untitled Gap",
      resolvedEntryId: input.resolvedEntryId || "",
      updatedAt: now(),
    };
    data.knowledgeGaps = data.knowledgeGaps.map((gap) => (gap.id === id ? updated : gap)).sort(sortGaps);
    this.write(data);
    return updated;
  }

  async deleteKnowledgeGap(id: string) {
    const data = this.read();
    data.knowledgeGaps = data.knowledgeGaps.filter((gap) => gap.id !== id);
    this.write(data);
  }

  async createTrail(input: TrailInput) {
    const data = this.read();
    const timestamp = now();
    const trail: Trail = {
      id: createId("trail"),
      title: input.title.trim() || "Untitled Trail",
      description: input.description,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.trails = [...data.trails, trail].sort(sortTrails);
    this.write(data);
    return trail;
  }

  async updateTrail(id: string, input: TrailInput) {
    const data = this.read();
    const existing = data.trails.find((trail) => trail.id === id);
    if (!existing) {
      throw new Error("Trail not found");
    }
    const updated: Trail = {
      ...existing,
      title: input.title.trim() || "Untitled Trail",
      description: input.description,
      updatedAt: now(),
    };
    data.trails = data.trails.map((trail) => (trail.id === id ? updated : trail)).sort(sortTrails);
    this.write(data);
    return updated;
  }

  async deleteTrail(id: string) {
    const data = this.read();
    data.trails = data.trails.filter((trail) => trail.id !== id);
    data.trailItems = data.trailItems.filter((item) => item.trailId !== id);
    this.write(data);
  }

  async createTrailItem(input: TrailItemInput) {
    const data = this.read();
    const timestamp = now();
    const item: TrailItem = {
      id: createId("trail_item"),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    data.trailItems = [...data.trailItems, item].sort(sortTrailItems);
    this.write(data);
    return item;
  }

  async updateTrailItem(id: string, input: TrailItemInput) {
    const data = this.read();
    const existing = data.trailItems.find((item) => item.id === id);
    if (!existing) {
      throw new Error("Trail item not found");
    }
    const updated: TrailItem = { ...existing, ...input, updatedAt: now() };
    data.trailItems = data.trailItems.map((item) => (item.id === id ? updated : item)).sort(sortTrailItems);
    this.write(data);
    return updated;
  }

  async deleteTrailItem(id: string) {
    const data = this.read();
    data.trailItems = data.trailItems.filter((item) => item.id !== id);
    this.write(data);
  }

  private read(): AppData {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      const seeded = seedData();
      this.write(seeded);
      return seeded;
    }

    const normalized = replacePreviousSeedData(normalizeData(JSON.parse(raw) as Partial<AppData>));
    this.write(normalized);
    return normalized;
  }

  private write(data: AppData) {
    localStorage.setItem(storageKey, JSON.stringify(normalizeData(data)));
  }
}

function normalizeData(partial: Partial<AppData>): AppData {
  const timestamp = now();
  const entries = (partial.entries ?? []).map((entry) => ({
    ...entry,
    entryType: entry.entryType ?? "entry",
    content: entry.content ?? "",
    category: entry.category ?? "",
    tags: normalizeTags(entry.tags ?? []),
    timelineDate: entry.timelineDate ?? "",
    timelineNote: entry.timelineNote ?? "",
    createdAt: entry.createdAt ?? timestamp,
    updatedAt: entry.updatedAt ?? timestamp,
  })) as Entry[];

  const bookPages = (partial.bookPages ?? []).map((page) => ({
    ...page,
    content: page.content ?? "",
    pageOrder: page.pageOrder ?? 1,
    createdAt: page.createdAt ?? timestamp,
    updatedAt: page.updatedAt ?? timestamp,
  })) as BookPage[];

  const contentBlocks = ((partial.contentBlocks ?? []) as ContentBlock[])
    .map((block) => ({
      ...block,
      blockType: block.blockType ?? "markdown",
      content: block.content ?? "",
      metadata: normalizeMetadata(block.metadata),
      blockOrder: block.blockOrder ?? 1,
      createdAt: block.createdAt ?? timestamp,
      updatedAt: block.updatedAt ?? timestamp,
    }))
    .sort(sortBlocks);

  const relations = (partial.relations ?? []).map((relation) => ({
    ...relation,
    relationType: relation.relationType === "related" ? "related to" : relation.relationType || "related to",
    note: relation.note ?? "",
    createdAt: relation.createdAt ?? timestamp,
    updatedAt: relation.updatedAt ?? timestamp,
  })) as Relation[];

  const knowledgeGaps = (partial.knowledgeGaps ?? []).map((gap) => ({
    ...gap,
    note: gap.note ?? "",
    status: gap.status ?? "open",
    resolvedEntryId: gap.resolvedEntryId ?? "",
    createdAt: gap.createdAt ?? timestamp,
    updatedAt: gap.updatedAt ?? timestamp,
  })) as KnowledgeGap[];

  const trails = ((partial.trails ?? []) as Trail[])
    .map((trail) => ({
      ...trail,
      title: trail.title || "Untitled Trail",
      description: trail.description ?? "",
      createdAt: trail.createdAt ?? timestamp,
      updatedAt: trail.updatedAt ?? timestamp,
    }))
    .sort(sortTrails);

  const trailItems = ((partial.trailItems ?? []) as TrailItem[])
    .map((item) => ({
      ...item,
      itemOrder: item.itemOrder ?? 1,
      note: item.note ?? "",
      createdAt: item.createdAt ?? timestamp,
      updatedAt: item.updatedAt ?? timestamp,
    }))
    .sort(sortTrailItems);

  const hydratedBlocks = [...contentBlocks];
  for (const entry of entries) {
    if (entry.content.trim() && !ownerHasBlocks(hydratedBlocks, "entry", entry.id)) {
      hydratedBlocks.push(makeBlock("entry", entry.id, "markdown", entry.content, 1, timestamp));
    }
  }
  for (const page of bookPages) {
    if (page.content.trim() && !ownerHasBlocks(hydratedBlocks, "book_page", page.id)) {
      hydratedBlocks.push(makeBlock("book_page", page.id, "markdown", page.content, 1, timestamp));
    }
  }

  return {
    entries: entries.sort(sortByTitle),
    bookPages: bookPages.sort(sortPages),
    contentBlocks: hydratedBlocks.sort(sortBlocks),
    relations,
    knowledgeGaps: knowledgeGaps.sort(sortGaps),
    trails,
    trailItems,
  };
}

function makeRelation(
  id: string,
  fromEntryId: string,
  toEntryId: string,
  relationType: string,
  timestamp: string,
): Relation {
  return {
    id,
    fromEntryId,
    toEntryId,
    relationType,
    note: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeGap(
  id: string,
  entryId: string,
  title: string,
  note: string,
  timestamp: string,
): KnowledgeGap {
  return {
    id,
    entryId,
    title,
    note,
    status: "open",
    resolvedEntryId: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeTrailItem(
  id: string,
  trailId: string,
  entryId: string,
  itemOrder: number,
  note: string,
  timestamp: string,
): TrailItem {
  return { id, trailId, entryId, itemOrder, note, createdAt: timestamp, updatedAt: timestamp };
}

function makeBlock(
  ownerType: "entry" | "book_page",
  ownerId: string,
  blockType: ContentBlock["blockType"],
  content: string,
  blockOrder: number,
  timestamp: string,
): ContentBlock {
  return {
    id: createId("block"),
    ownerType,
    ownerId,
    blockType,
    content,
    metadata: "{}",
    blockOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function ownerHasBlocks(blocks: ContentBlock[], ownerType: "entry" | "book_page", ownerId: string) {
  return blocks.some((block) => block.ownerType === ownerType && block.ownerId === ownerId);
}

function projectBlocksToContent(blocks: ContentBlock[]) {
  return [...blocks]
    .sort((a, b) => a.blockOrder - b.blockOrder)
    .filter((block) => block.blockType !== "divider")
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizeMetadata(value: string | undefined) {
  if (!value?.trim()) {
    return "{}";
  }
  try {
    JSON.parse(value);
    return value;
  } catch {
    return "{}";
  }
}

const sortByTitle = (a: Entry, b: Entry) => a.title.localeCompare(b.title);
const sortPages = (a: BookPage, b: BookPage) =>
  a.entryId.localeCompare(b.entryId) || a.pageOrder - b.pageOrder || a.title.localeCompare(b.title);
const sortBlocks = (a: ContentBlock, b: ContentBlock) =>
  a.ownerType.localeCompare(b.ownerType) || a.ownerId.localeCompare(b.ownerId) || a.blockOrder - b.blockOrder;
const sortGaps = (a: KnowledgeGap, b: KnowledgeGap) =>
  a.status.localeCompare(b.status) || a.title.localeCompare(b.title);
const sortTrails = (a: Trail, b: Trail) => a.title.localeCompare(b.title);
const sortTrailItems = (a: TrailItem, b: TrailItem) =>
  a.trailId.localeCompare(b.trailId) || a.itemOrder - b.itemOrder;

const normalizeTags = (tags: string[]) =>
  Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));

export const lexiconRepository: LexiconRepository = isTauriRuntime()
  ? new TauriLexiconRepository()
  : new DemoLexiconRepository();
